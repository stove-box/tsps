// Run after `yarn build`: node --test tests/boss-helper-tool.test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test, before } = require("node:test");

process.env.DISABLE_PLAYER_BOTS = "1";
const { Server } = require("../dist/Server");
Server.installProductionPathResolver();

const { CachePipeline } = require("../dist/game/cache/CachePipeline");
const { PluginManager } = require("../dist/plugins/PluginManager");
const BossHelperTool = require("../plugins/items/BossHelperTool.plugin");
const Common = require("../plugins/items/bosshelpertool/Common.BossHelperTool");
const Debug = require("../plugins/items/bosshelpertool/Debug.BossHelperTool");
const Teleports = require("../plugins/items/bosshelpertool/Teleports.BossHelperTool");
const Supplies = require("../plugins/items/bosshelpertool/Supplies.BossHelperTool");
const Stats = require("../plugins/items/bosshelpertool/Stats.BossHelperTool");
const Unlock = require("../plugins/items/bosshelpertool/Unlock.BossHelperTool");
const SlayerData = require("../plugins/skills/slayer/Data.Slayer");
const SlayerState = require("../plugins/skills/slayer/State.Slayer");
const SlayerDev = require("../plugins/skills/slayer/Dev.Slayer");

/** The Wiki's Boss list, in its order. */
const WIKI_BOSS_LIST = [
  "Abyssal Sire", "Alchemical Hydra", "Barrows", "Bryophyta (Moss giant boss)", "Callisto", "Cerberus", "Chaos Elemental",
  "Chaos Fanatic", "Crazy Archaeologist", "Chambers of Xeric", "Corporeal Beast", "Commander Zilyana", "Dagannoth Kings",
  "Deranged Archaeologist", "Gauntlet", "Gauntlet (Corrupted)", "General Graador", "Giant Mole", "Grotesque Guardians",
  "Hespori", "Kalphite Queen", "King Black Dragon", "Kraken", "Kree'arra", "K'ril Tsutsaroth", "Nex", "Nightmare",
  "Nightmare (Phosanis)", "Obor (Hill giant boss)", "Sarachnis", "Scorpia", "Skotizo", "Tempoross", "Theatre of Blood",
  "Tombs of Amascut", "Thermonuclear Smoke Devil", "Tzhaar Challenges (6 Jad)", "TzKal-Zuk (inferno)", "TzTok-Jad",
  "Venenatis", "Vet'ion", "Vorkath", "Wintertodt", "Zalcano", "Zulrah", "Ferox Enclave",
];

let core;
const actions = {};
let emitted = [];
let answers = {};
let teleportAllowed = true;
let teleported = [];

before(async () => {
  await CachePipeline.initialize();
  const real = PluginManager.getCoreApi();
  core = {
    ...real,
    WeaponInterfaceManager: { assign() {} },
    TeleportHandler: {
      checkReqs: () => teleportAllowed,
      confirm: (player, destination, go) => go(),
      teleport: (player, destination) => teleported.push(destination),
    },
  };
  const api = {
    core,
    emitCustomEvent(name, request) {
      emitted.push([name, request]);
      answers[name]?.(request);
    },
    onItemAction(name, handlers) {
      assert.equal(name, "Boss helper tool");
      Object.assign(actions, handlers);
    },
    onInterfaceActionClick() {},
    onInterfaceActionButton() {},
    registerCustomInterface() {},
  };
  BossHelperTool.register(api);
  const slayerApi = { core: real, emitCustomEvent() {} };
  SlayerData.init(slayerApi);
  SlayerState.init(slayerApi);
});

function reset() {
  emitted = [];
  answers = {};
  teleportAllowed = true;
  teleported = [];
}

/** A stand-in inventory or equipment: `items` are Items, `capacity` slots. */
function container(items = [], capacity = 28) {
  return {
    items,
    getItems: () => items,
    getAddableAmount(item) {
      const stackable = core.ItemDefinition.forId(item.getId()).isStackable();
      if (stackable) return items.some((held) => held.getId() === item.getId()) || items.length < capacity ? item.getAmount() : 0;
      return Math.min(item.getAmount(), capacity - items.length);
    },
    add(item) { items.push(item); return this; },
    forceAdd(player, item) { items.push(item); },
  };
}

function createPlayer({ rights = "OWNER", inventory = [], equipment = [] } = {}) {
  const sent = [];
  const varps = new Map();
  const varbits = new Map();
  const attributes = new Map();
  const skills = new Map();
  let interfaceId = -1;
  let mount = 0;
  let prompt = null;
  const sender = {
    sendClientScript(...args) { sent.push(["script", ...args]); return sender; },
    sendInterface(id) { interfaceId = id; mount++; sent.push(["interface", id]); return sender; },
    sendSubInterface(target, id) { interfaceId = id; mount++; sent.push(["sub", id]); return sender; },
    getSubInterfaceAt: () => mount,
    sendInterfaceFlagsRange(...args) { sent.push(["flags", ...args]); return sender; },
    sendInterfaceRemoval() { interfaceId = -1; mount++; sent.push(["close"]); return sender; },
    sendString(text, uid) { sent.push(["string", uid, text]); return sender; },
    sendEnterAmountPrompt(text) { sent.push(["prompt", text]); return sender; },
    sendExpDrop(skill, amount) { sent.push(["xpdrop", skill.getName(), amount]); return sender; },
    sendConfig(id, value) { varps.set(id, value); return sender; },
    sendVarbit(id, value) { varbits.set(id, value); return sender; },
    getVarp: (id) => varps.get(id) ?? 0,
    getVarbit: (id) => varbits.get(id) ?? 0,
  };
  const skillManager = {
    level: (skill) => skills.get(skill)?.level ?? (skill === core.Skill.HITPOINTS ? 10 : 1),
    getMaxLevel: (skill) => skillManager.level(skill),
    getExperience: (skill) => skills.get(skill)?.experience ?? core.SkillManager.getExperienceForLevel(skillManager.level(skill)),
    setCurrentLevels(skill, level) { skills.set(skill, { ...skills.get(skill), level }); return skillManager; },
    setMaxLevel(skill, level) { skills.set(skill, { ...skills.get(skill), level }); return skillManager; },
    setExperience(skill, experience) { skills.set(skill, { ...skills.get(skill), experience }); return skillManager; },
  };
  return {
    sent,
    messages: [],
    get prompt() { return prompt; },
    getRights: () => core.PlayerRights[rights],
    sendMessage(text) { this.messages.push(text); },
    getPacketSender: () => sender,
    getInterfaceId: () => interfaceId,
    setInterfaceId(id) { interfaceId = id; },
    getFrameUpdater: () => ({ clear() {} }),
    getInventory: (() => { const inv = container(inventory); return () => inv; })(),
    getEquipment: (() => { const worn = container(equipment, 14); return () => worn; })(),
    getSkillManager: () => skillManager,
    getUpdateFlag: () => ({ flag() {} }),
    getAttribute: (key) => attributes.get(key),
    setAttribute: (key, value) => attributes.set(key, value),
    setEnteredAmountAction(action) { prompt = action; },
    varps,
    varbits,
  };
}

/** The labels of the last menu-187 the player was sent (script 217's second argument). */
function lastMenu(player) {
  const call = player.sent.filter(([kind, id]) => kind === "script" && id === 217).at(-1);
  return call && { title: call[2], labels: call[3].split("|") };
}

/** Clicks the menu's entry at `index` (0-based), as menu:lj_layer1's pause button. */
function choose(player, index) {
  const event = { player, buttonId: Common.MENU_CHOICES, slot: index, handled: false };
  Common.chooseFromMenu(event);
  return event;
}

const carried = (player) => player.getInventory().getItems().map((item) => core.CacheDefinitions.getItem(item.getId()).name);
const events = (name) => emitted.filter(([kind]) => kind === name).map(([, request]) => request);

test("the cache gives the Boss helper tool its Debug option", () => {
  const item = core.CacheDefinitions.getItem(core.ItemIdentifiers.BOSS_HELPER_TOOL);
  assert.equal(item.name, "Boss helper tool");
  assert.equal(item.inventoryActions?.[0], "Debug");
});

test("players below owner are refused", () => {
  reset();
  const player = createPlayer({ rights: "ADMINISTRATOR" });
  actions.Debug({ player });
  assert.equal(lastMenu(player), undefined);
  assert.deepEqual(player.messages, ["Nothing interesting happens."]);
});

test("Debug opens the menu with the five tools, in order", () => {
  reset();
  const player = createPlayer();
  actions.Debug({ player });
  assert.deepEqual(player.sent.find(([kind]) => kind === "interface"), ["interface", 187]);
  assert.deepEqual(lastMenu(player), {
    title: Debug.TITLE, labels: ["Teleports", "All Gear", "Swap Spellbook", "Set Stats", "Unlock Everything"],
  });
});

test("Teleports opens the Boss list with every destination and its icon", () => {
  reset();
  const player = createPlayer();
  actions.Debug({ player });
  assert.equal(choose(player, 0).handled, true);
  assert.equal(player.getInterfaceId(), 30017);
  const rows = JSON.parse(player.sent.find(([kind, uid]) => kind === "string" && uid === ((30017 << 16) | 5))[2]);
  assert.deepEqual(rows.map((row) => row.name), WIKI_BOSS_LIST);
  for (const row of rows) assert.ok(row.icon > 0, `${row.name} has an icon`);
  // The client's list leaves out a row with id 0: the first destination must not have it.
  assert.ok(rows.every((row) => row.id > 0));
});

test("a click on a grid cell teleports to the row id it carries", () => {
  reset();
  const player = createPlayer();
  Teleports.open(player);
  assert.equal(Teleports.clickRow({ player, slot: 1 }), true);
  assert.deepEqual([teleported[0].getX(), teleported[0].getY()], [3039, 4800], "row 1 is the Abyssal Sire");
  assert.equal(player.getInterfaceId(), -1, "the list closes");
});

test("a menu that isn't open any more ignores the click", () => {
  reset();
  const player = createPlayer();
  actions.Debug({ player });
  player.getPacketSender().sendInterfaceRemoval();
  assert.equal(choose(player, 0).handled, false);
  assert.equal(player.getInterfaceId(), -1);
});

test("every destination's tile, items, task and quests exist", () => {
  const questDir = path.join(__dirname, "..", "plugins", "quests", "quests");
  const questSources = fs.readdirSync(questDir).filter((file) => file.endsWith(".js"))
    .map((file) => fs.readFileSync(path.join(questDir, file), "utf8")).join("\n");
  for (const entry of Teleports.DESTINATIONS) {
    assert.ok(Array.isArray(entry.tile) && entry.tile.length === 3, `${entry.name} has a tile`);
    for (const item of entry.items ?? []) assert.ok(Common.objId(item) > 0, `${entry.name}: ${item} is an obj`);
    for (const key of entry.quests ?? []) assert.match(questSources, new RegExp(`key: "${key}"`), `${entry.name}: ${key} is a quest`);
    if (entry.boss || entry.task) {
      const player = createPlayer();
      const request = { player, boss: entry.boss, task: entry.task, amount: 5, assigned: null };
      SlayerDev.assignTask(request);
      assert.ok(request.assigned, `${entry.name}: the Slayer task ${entry.boss ?? entry.task} exists`);
    }
  }
});

test("a boss teleport sets its Boss task, completes its quest and hands over what isn't carried", () => {
  reset();
  answers["slayer:assign-task"] = (request) => SlayerDev.assignTask(request);
  const player = createPlayer({ inventory: [new core.Item(core.ItemIdentifiers.HAMMER, 1)] });
  const graardor = Teleports.DESTINATIONS.find((entry) => entry.name === "General Graador");
  Teleports.teleport(player, graardor);
  assert.equal(teleported.length, 1);
  assert.deepEqual([teleported[0].getX(), teleported[0].getY(), teleported[0].getZ()], [2862, 5354, 2]);
  assert.deepEqual(events("quest:auto-complete").map((request) => request.key), ["troll_stronghold"]);
  assert.deepEqual(carried(player), ["Hammer", "Ecumenical key"], "the hammer already carried isn't given twice");
  const varp = (name) => player.varps.get(core.CacheDefinitions.getVarpId(name));
  const varbit = (name) => player.varbits.get(core.CacheDefinitions.getVarbitId(name));
  assert.equal(varp("slayer_target"), SlayerData.BOSS_TASK_ID);
  assert.equal(varbit("slayer_target_bossid"), 3, "General Graardor's boss task");
  assert.equal(varp("slayer_count"), Teleports.BOSS_TASK_KILLS);
  assert.deepEqual(player.messages, ["Your new task is to kill 35 General Graardor."]);
});

test("Jad and Zuk set their own tasks; a destination with no task leaves the task alone", () => {
  reset();
  answers["slayer:assign-task"] = (request) => SlayerDev.assignTask(request);
  const player = createPlayer();
  Teleports.teleport(player, Teleports.DESTINATIONS.find((entry) => entry.name === "TzTok-Jad"));
  assert.equal(player.varps.get(core.CacheDefinitions.getVarpId("slayer_target")), 97);
  assert.equal(player.varps.get(core.CacheDefinitions.getVarpId("slayer_count")), 1);
  Teleports.teleport(player, Teleports.DESTINATIONS.find((entry) => entry.name === "Ferox Enclave"));
  assert.equal(events("slayer:assign-task").length, 1);
});

test("a teleport refused by the usual checks (above level 20 Wilderness) changes nothing", () => {
  reset();
  teleportAllowed = false;
  const player = createPlayer();
  Teleports.teleport(player, Teleports.DESTINATIONS.find((entry) => entry.name === "Vorkath"));
  assert.equal(teleported.length, 0);
  assert.equal(emitted.length, 0);
  assert.deepEqual(carried(player), []);
});

test("All Gear needs a bank nearby", () => {
  reset();
  const player = createPlayer();
  Supplies.open(player);
  assert.deepEqual(player.messages, ["You need to be near a bank to use this feature"]);
  assert.equal(player.getInterfaceId(), -1);
});

test("All Gear opens the supplies table, whose items come from enum 1124", () => {
  reset();
  answers["league:near-bank"] = (query) => { query.near = true; };
  const player = createPlayer();
  Supplies.open(player);
  assert.equal(player.getInterfaceId(), 100);
  assert.equal(Supplies.supplyItems().length, 648);
  assert.deepEqual(player.sent.find(([kind]) => kind === "flags").slice(1, 4), [(100 << 16) | 4, 0, 647]);
});

test("Take gives one; Take-5, Take-10 and Take-X only stack; a full inventory gets nothing", () => {
  reset();
  answers["league:near-bank"] = (query) => { query.near = true; };
  const player = createPlayer();
  Supplies.open(player);
  const items = Supplies.supplyItems();
  const stackable = items.findIndex((id) => core.ItemDefinition.forId(id).isStackable());
  const single = items.findIndex((id) => !core.ItemDefinition.forId(id).isStackable());
  Supplies.clickItem({ player, slot: single, opId: 1 });
  Supplies.clickItem({ player, slot: stackable, opId: 3 });
  Supplies.clickItem({ player, slot: stackable, opId: 4 });
  assert.deepEqual(player.sent.at(-1), ["prompt", "Enter amount:"]);
  player.prompt.execute(250);
  const amounts = player.getInventory().getItems().map((item) => [item.getId(), item.getAmount()]);
  assert.deepEqual(amounts, [[items[single], 1], [items[stackable], 10], [items[stackable], 250]]);
  const full = createPlayer({ inventory: Array.from({ length: 28 }, () => new core.Item(core.ItemIdentifiers.HAMMER, 1)) });
  Supplies.open(full);
  Supplies.clickItem({ player: full, slot: single, opId: 1 });
  assert.deepEqual(full.messages, ["You don't have enough inventory space."]);
});

test("Set Stats lists every skill with its level, and sets the chosen one", () => {
  reset();
  const player = createPlayer();
  Stats.open(player);
  const menu = lastMenu(player);
  assert.equal(menu.title, "Set which skill?");
  assert.deepEqual(menu.labels.slice(0, 8), ["(Cancel)", "Attack (1)", "Strength (1)", "Ranged (1)", "Magic (1)", "Defence (1)", "Hitpoints (10)", "Prayer (1)"]);
  assert.equal(menu.labels[12], "Runecraft (1)");
  assert.equal(menu.labels.length, Stats.skills().length + 1);
  choose(player, 2);
  assert.deepEqual(player.sent.at(-1), ["prompt", "Enter a level:"]);
  player.prompt.execute(99);
  assert.equal(player.getSkillManager().getMaxLevel(core.Skill.STRENGTH), 99);
  const gained = core.SkillManager.getExperienceForLevel(99) - core.SkillManager.getExperienceForLevel(1);
  assert.ok(player.sent.some(([kind, name, amount]) => kind === "xpdrop" && name === "Strength" && amount === gained));
  assert.equal(lastMenu(player).labels[2], "Strength (99)", "the menu opens again with the new level");
});

test("Set Stats keeps Hitpoints at 10 or more, and lowering shows no experience drop", () => {
  reset();
  const player = createPlayer();
  const hitpoints = Stats.skills().find(({ key }) => key === "HITPOINTS");
  assert.equal(Stats.setStat(player, hitpoints, 9), false);
  assert.deepEqual(player.messages, ["Hitpoints can be set from 10 to 99."]);
  const attack = Stats.skills().find(({ key }) => key === "ATTACK");
  Stats.setStat(player, attack, 50);
  player.sent.length = 0;
  Stats.setStat(player, attack, 20);
  assert.equal(player.getSkillManager().getMaxLevel(core.Skill.ATTACK), 20);
  assert.equal(player.sent.filter(([kind]) => kind === "xpdrop").length, 0);
});

test("Unlock Everything completes quests and diaries and moves a furnished house to Rimmington", () => {
  reset();
  answers["quest:auto-complete-all"] = (request) => { request.completed = 200; };
  answers["diary:complete-all"] = (request) => { request.completed = 480; };
  answers["construction:max-house"] = (request) => { request.handled = true; };
  const player = createPlayer();
  assert.deepEqual(Unlock.unlockEverything(player), { quests: 200, diaries: 480, house: true });
  assert.equal(events("construction:max-house")[0].location, 1);
  assert.deepEqual(player.messages, ["Unlocked: 200 quests, 480 diary tasks, and a furnished house in Rimmington."]);
});

test("Swap Spellbook opens the occult altar's Venerate menu", () => {
  reset();
  answers["altars:venerate-occult"] = (request) => { request.handled = true; };
  const player = createPlayer();
  Debug.swapSpellbook(player);
  assert.equal(events("altars:venerate-occult").length, 1);
  assert.deepEqual(player.messages, []);
});
