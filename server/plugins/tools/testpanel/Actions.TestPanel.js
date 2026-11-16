// What the test panel can do: read live world state, run ::commands as an online player, search
// item and NPC definitions, broadcast and save. Everything that touches the game runs on
// the next game tick (a TaskManager task), never inside the HTTP callback.

const { HttpError } = require("../worldadmin/Http.WorldAdmin");
const { resolveLoadouts } = require("./Loadouts.TestPanel");

const SKILL_NAMES = [
  "Attack", "Defence", "Strength", "Hitpoints", "Ranged", "Prayer", "Magic", "Cooking",
  "Woodcutting", "Fletching", "Fishing", "Firemaking", "Crafting", "Smithing", "Mining",
  "Herblore", "Agility", "Thieving", "Slayer", "Farming", "Runecrafting", "Construction",
  "Hunter", "Sailing",
];
const RIGHTS_NAMES = ["Player", "Moderator", "Administrator", "Owner", "Developer"];
const USERNAME = /^[a-z0-9][a-z0-9 _-]{0,19}$/i;
const MAX_COMMAND_LENGTH = 200;
const MAX_BROADCAST_LENGTH = 200;
const SEARCH_LIMIT = 60;
// Ticks to keep collecting a command's chat messages after it ran (some reply a tick later).
const MESSAGE_TICKS = 2;
const startedAt = Date.now();

// player -> Set of message arrays currently collecting what player.sendMessage says.
const collectors = new Map();

function onNextTick(core, fn) {
  return new Promise((resolve, reject) => {
    core.TaskManager.submit(new (class extends core.Task {
      constructor() { super(1); }
      execute() {
        this.stop();
        try { resolve(fn()); } catch (error) { reject(error); }
      }
    })());
  });
}

function collectMessages(player) {
  const messages = [];
  let set = collectors.get(player);
  if (!set) {
    set = new Set();
    collectors.set(player, set);
    const original = player.sendMessage;
    player.sendMessage = function capturedSendMessage(message, ...rest) {
      for (const sink of collectors.get(player) ?? []) sink.push(String(message));
      return original.call(this, message, ...rest);
    };
    set.restore = () => {
      if (Object.prototype.hasOwnProperty.call(player, "sendMessage")) delete player.sendMessage;
      if (player.sendMessage !== original) player.sendMessage = original;
    };
  }
  set.add(messages);
  return {
    messages,
    stop() {
      set.delete(messages);
      if (set.size === 0) {
        set.restore();
        collectors.delete(player);
      }
    },
  };
}

function onlinePlayers(core) {
  return core.World.getPlayers()?.stream?.().filter(Boolean) ?? [];
}

function findPlayer(core, name) {
  if (typeof name !== "string" || !USERNAME.test(name)) throw new HttpError(400, "Invalid player name.");
  const player = core.World.getPlayerByName(name);
  if (!player || player.isPlayerBot?.()) throw new HttpError(404, `${name} is not online.`);
  return player;
}

function playerSummary(player) {
  const location = player.getLocation();
  const skills = player.getSkillManager();
  const rightsId = player.getRights().getId();
  return {
    username: player.getUsername(),
    rights: rightsId,
    rightsName: RIGHTS_NAMES[rightsId] ?? String(rightsId),
    x: location.getX(),
    y: location.getY(),
    z: location.getZ(),
    hitpoints: player.getHitpoints(),
    runEnergy: Math.round(player.getRunEnergy?.() ?? 0),
    combat: skills.getCombatLevel(),
    total: skills.getTotalLevel(),
  };
}

function playerDetail(player) {
  const skills = player.getSkillManager().getSkills();
  return {
    ...playerSummary(player),
    skills: SKILL_NAMES.map((name, index) => ({
      name,
      level: skills.level[index] ?? 1,
      maxLevel: skills.maxLevel[index] ?? 1,
      experience: Math.floor(skills.experience[index] ?? 0),
    })),
  };
}

function stateAction(core) {
  const players = onlinePlayers(core);
  const humans = players.filter((player) => !player.isPlayerBot?.());
  const memory = process.memoryUsage();
  return {
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    shuttingDown: core.Server.isShuttingDown?.() === true,
    profile: core.GameConstants?.WORLD_PROFILE ?? null,
    memory: { rssMb: Math.round(memory.rss / 1048576), heapUsedMb: Math.round(memory.heapUsed / 1048576) },
    perf: core.ServerPerf?.getSummary?.(100) ?? null,
    npcCount: core.World.getNpcs()?.stream?.().filter(Boolean).length ?? 0,
    botCount: players.length - humans.length,
    players: humans.map(playerSummary),
    worldAdminPort: process.env.WORLD_ADMIN_PORT || null,
    clientPort: process.env.PORT || null,
  };
}

function playerAction(core, name) {
  return playerDetail(findPlayer(core, name));
}

function parseCommand(text) {
  if (typeof text !== "string") throw new HttpError(400, "text must be a string");
  const raw = text.replace(/\u0000/g, " ").replace(/^[:/]+/, "").trim();
  if (!raw || raw.length > MAX_COMMAND_LENGTH) throw new HttpError(400, `Commands are 1 to ${MAX_COMMAND_LENGTH} characters.`);
  const parts = raw.split(/\s+/);
  const base = parts[0].toLowerCase();
  if (!/^[a-z0-9_]+$/.test(base)) throw new HttpError(400, "Not a command.");
  parts[0] = base;
  return { raw, base, parts };
}

/** On the game tick: runs a parsed command as `player` with Developer rights for this one call. */
function runAsDeveloper(core, player, { raw, base, parts }) {
  const rights = player.getRights();
  player.setRights(core.PlayerRights.DEVELOPER);
  try {
    return core.PluginManager.emitCommand({ player, raw, base, parts, handled: false });
  } finally {
    // A command that changed the rank itself keeps its change.
    if (player.getRights() === core.PlayerRights.DEVELOPER) player.setRights(rights);
  }
}

function assertOnline(player, name) {
  if (player.isRegistered && !player.isRegistered()) throw new HttpError(409, `${name} logged out.`);
}

/** Runs `fn` on the next tick while collecting the chat messages `player` gets meanwhile. */
async function withMessages(core, player, fn) {
  const capture = collectMessages(player);
  let result;
  try {
    result = await onNextTick(core, fn);
    for (let tick = 0; tick < MESSAGE_TICKS; tick++) await onNextTick(core, () => undefined);
  } finally {
    capture.stop();
  }
  return { result, messages: capture.messages };
}

/** Runs `text` as `name` with Developer rights for this one command, like the agent MCP does. */
async function commandAction(core, { player: name, text }) {
  const command = parseCommand(text);
  const player = findPlayer(core, name);
  const { result: handled, messages } = await withMessages(core, player, () => {
    assertOnline(player, name);
    return runAsDeveloper(core, player, command);
  });
  if (!handled) messages.push(`::${command.base} is not a command.`);
  return { handled, messages, player: player.isRegistered?.() === false ? null : playerDetail(player) };
}

function loadoutsAction(core) {
  return { loadouts: resolveLoadouts(core) };
}

/** On the game tick: empties the inventory and takes off everything worn, through the real unequip. */
function stripPlayer(core, player) {
  const inventory = player.getInventory();
  const equipment = player.getEquipment();
  inventory.resetItems().refreshItems();
  for (let slot = 0; slot < equipment.capacity(); slot++) {
    if (!equipment.getItems()[slot]?.isValid?.()) continue;
    core.EquipPacketListener.unequip(player, slot);
    inventory.resetItems().refreshItems();
  }
}

// What the equip path says when a quest gates an item, and the quest that unlocks it.
const QUEST_REQUIREMENT = /You need to complete (?:the )?(.+?) quest first/i;
// AncientRings: the Desert Treasure II rings need their boss killed, which the quest counts.
const ANCIENT_RING_REFUSAL = /The ring slips off your finger/i;
const ANCIENT_RING_QUEST = "Desert Treasure II";

/** On the game tick: wears each item through the real equip path. Returns what stayed off. */
function wearAll(core, player, items) {
  const inventory = player.getInventory();
  const notWorn = [];
  const notAdded = [];
  for (const item of items) {
    if (item.id === null) { notWorn.push(item.constant); continue; }
    inventory.adds(item.id, item.amount);
    const slot = inventory.getSlotForItemId(item.id);
    if (slot < 0) { notAdded.push(item.name); continue; }
    core.EquipPacketListener.equip(player, item.id, slot, core.Inventory.INTERFACE_ID);
    if (!player.getEquipment().contains(item.id)) notWorn.push(item.name);
  }
  return { notWorn, notAdded };
}

/** The quests named by equip refusals in `messages` (from index `from`). */
function questsNamedIn(messages, from) {
  const quests = new Set();
  for (const message of messages.slice(from)) {
    const text = String(message).replace(/<[^>]+>/g, "");
    const named = QUEST_REQUIREMENT.exec(text)?.[1]?.trim();
    if (named) quests.add(named);
    if (ANCIENT_RING_REFUSAL.test(text)) quests.add(ANCIENT_RING_QUEST);
  }
  return [...quests];
}

/**
 * Puts a loadout on `name`: optional ::master first (so level requirements pass), then the worn
 * items through the real equip path, then the inventory. With `unlock`, quests that refused an
 * item are completed with ::quest <name> complete and the gear is put on again. Reports what
 * could not be worn or added.
 */
async function loadoutAction(core, { player: name, id, maxStats = true, replace = true, unlock = true }) {
  const loadout = resolveLoadouts(core).find((entry) => entry.id === id);
  if (!loadout) throw new HttpError(404, "Unknown loadout.");
  const player = findPlayer(core, name);
  const strip = loadout.keepWorn ? () => player.getInventory().resetItems().refreshItems() : () => stripPlayer(core, player);
  const capture = collectMessages(player);
  let result;
  try {
    result = await onNextTick(core, () => {
      assertOnline(player, name);
      if (maxStats) runAsDeveloper(core, player, parseCommand("master"));
      if (replace) strip();
      const before = capture.messages.length;
      let worn = wearAll(core, player, loadout.equip);
      const completedQuests = [];
      const quests = unlock && worn.notWorn.length ? questsNamedIn(capture.messages, before) : [];
      if (quests.length) {
        for (const quest of quests) {
          runAsDeveloper(core, player, parseCommand(`quest ${quest} complete`));
          completedQuests.push(quest);
        }
        // Quest rewards land in the inventory, and the refused items are still there: start over.
        if (replace) strip();
        else for (const item of loadout.equip) if (item.id !== null && !player.getEquipment().contains(item.id)) player.getInventory().delete(item.id, item.amount);
        worn = wearAll(core, player, loadout.equip);
      }
      const inventory = player.getInventory();
      const notAdded = [...worn.notAdded];
      for (const item of loadout.inventory) {
        if (item.id === null) { notAdded.push(item.constant); continue; }
        if (inventory.getAddableAmount?.(new core.Item(item.id, item.amount)) === 0) { notAdded.push(item.name); continue; }
        inventory.adds(item.id, item.amount);
      }
      inventory.refreshItems();
      return { notWorn: worn.notWorn, notAdded, completedQuests };
    });
    for (let tick = 0; tick < MESSAGE_TICKS; tick++) await onNextTick(core, () => undefined);
  } finally {
    capture.stop();
  }
  return { loadout: loadout.name, ...result, messages: capture.messages, player: playerDetail(player) };
}

/** Every registered command a Developer may run, with its description. */
function commandsAction(api) {
  const developer = { getRights: () => api.core.PlayerRights.DEVELOPER };
  return { commands: api.getRegisteredCommands(developer) };
}

function search(definitions, query, extra) {
  const text = String(query ?? "").trim().toLowerCase();
  if (!text) return [];
  const asId = /^\d+$/.test(text) ? Number(text) : null;
  const results = [];
  for (const [id, definition] of definitions) {
    const name = definition?.getName?.() ?? "";
    if (!name || name === "null") continue;
    if (id === asId || name.toLowerCase().includes(text)) {
      results.push({ id, name, ...extra(definition) });
      if (results.length >= SEARCH_LIMIT) break;
    }
  }
  return results.sort((a, b) => (a.id === asId ? -1 : b.id === asId ? 1 : a.name.length - b.name.length));
}

function itemsAction(core, query) {
  return {
    results: search(core.ItemDefinition.definitions, query, (definition) => ({
      noted: definition.isNoted?.() === true,
      stackable: definition.isStackable?.() === true,
    })),
  };
}

function npcsAction(core, query) {
  return {
    results: search(core.NpcDefinition.definitions, query, (definition) => ({
      combat: definition.getCombatLevel?.() ?? null,
    })),
  };
}

async function broadcastAction(core, { text }) {
  const message = typeof text === "string" ? text.trim() : "";
  if (!message || message.length > MAX_BROADCAST_LENGTH) throw new HttpError(400, `Messages are 1 to ${MAX_BROADCAST_LENGTH} characters.`);
  await onNextTick(core, () => core.World.sendMessage(`<col=ff0000>[Server]</col> ${message}`));
  return { sent: true };
}

async function saveAllAction(core) {
  const persistence = core.GameConstants?.PLAYER_PERSISTENCE;
  if (!persistence) throw new HttpError(409, "Player saves are not available.");
  const players = await onNextTick(core, () => {
    const humans = onlinePlayers(core).filter((player) => !player.isPlayerBot?.());
    for (const player of humans) persistence.save(player, "test-panel");
    return humans.length;
  });
  await persistence.flush?.();
  return { saved: players };
}

module.exports = {
  stateAction,
  playerAction,
  commandAction,
  commandsAction,
  loadoutsAction,
  loadoutAction,
  itemsAction,
  npcsAction,
  broadcastAction,
  saveAllAction,
};
