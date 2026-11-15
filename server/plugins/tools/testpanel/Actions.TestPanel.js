// What the test panel can do: read live world state, run ::commands as an online player, search
// item and NPC definitions, broadcast and save. Everything that touches the game runs on
// the next game tick (a TaskManager task), never inside the HTTP callback.

const { HttpError } = require("../worldadmin/Http.WorldAdmin");

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

/** Runs `text` as `name` with Developer rights for this one command, like the agent MCP does. */
async function commandAction(core, { player: name, text }) {
  if (typeof text !== "string") throw new HttpError(400, "text must be a string");
  const raw = text.replace(/\u0000/g, " ").replace(/^[:/]+/, "").trim();
  if (!raw || raw.length > MAX_COMMAND_LENGTH) throw new HttpError(400, `Commands are 1 to ${MAX_COMMAND_LENGTH} characters.`);
  const parts = raw.split(/\s+/);
  const base = parts[0].toLowerCase();
  if (!/^[a-z0-9_]+$/.test(base)) throw new HttpError(400, "Not a command.");
  parts[0] = base;

  const player = findPlayer(core, name);
  const capture = collectMessages(player);
  let handled = false;
  try {
    handled = await onNextTick(core, () => {
      if (player.isRegistered && !player.isRegistered()) throw new HttpError(409, `${name} logged out.`);
      const rights = player.getRights();
      player.setRights(core.PlayerRights.DEVELOPER);
      try {
        return core.PluginManager.emitCommand({ player, raw, base, parts, handled: false });
      } finally {
        // A command that changed the rank itself keeps its change.
        if (player.getRights() === core.PlayerRights.DEVELOPER) player.setRights(rights);
      }
    });
    for (let tick = 0; tick < MESSAGE_TICKS; tick++) await onNextTick(core, () => undefined);
  } finally {
    capture.stop();
  }
  if (!handled) capture.messages.push(`::${base} is not a command.`);
  return { handled, messages: capture.messages, player: player.isRegistered?.() === false ? null : playerDetail(player) };
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
  itemsAction,
  npcsAction,
  broadcastAction,
  saveAllAction,
};
