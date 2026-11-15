// Run after `yarn build`: node --test tests/holiday-tool.test.cjs
const assert = require("node:assert/strict");
const { test, before, beforeEach } = require("node:test");

const { Server } = require("../dist/Server");
Server.installProductionPathResolver();

const { CachePipeline } = require("../dist/game/cache/CachePipeline");
const { PluginManager } = require("../dist/plugins/PluginManager");
const HolidayTool = require("../plugins/items/HolidayTool.plugin");
const Spawns = require("../plugins/items/holidaytool/Spawns.HolidayTool");

let core;
const actions = {};
const grounds = [];
let map = { blocked: new Set(), water: new Set(), objects: [] };
const tileKey = (x, y) => `${x},${y}`;
const isBlocked = (x, y) => map.blocked.has(tileKey(x, y));
const at = (location) => tileKey(location.getX(), location.getY());
const ORIGIN = [3222, 3218];

/** Scenery for the test map: `type` 10 stands in the middle of its tile(s), 22 is ground decoration. */
function scenery(name, x, y, { type = 10, sizeX = 1, sizeY = 1, blocks = true } = {}) {
  map.objects.push({
    getType: () => type,
    getFace: () => 0,
    getLocation: () => new core.Location(x, y, 0),
    getPrivateArea: () => null,
    getDefinition: () => ({ getName: () => name, getSizeX: () => sizeX, getSizeY: () => sizeY }),
  });
  if (blocks) for (let dx = 0; dx < sizeX; dx++) for (let dy = 0; dy < sizeY; dy++) map.blocked.add(tileKey(x + dx, y + dy));
}

before(async () => {
  await CachePipeline.initialize();
  core = {
    ...PluginManager.getCoreApi(),
    ItemOnGroundManager: { register: (item) => grounds.push(item) },
    // A test map: `map.blocked` tiles can't be stood on, `map.water` is water, `map.objects` are scenery
    // by tile. A diagonal step needs both of its sides open, as in the game.
    RegionManager: {
      canMove: (x, y, nx, ny) => !isBlocked(nx, ny) && (x === nx || y === ny || (!isBlocked(nx, y) && !isBlocked(x, ny))),
      blocked: (location) => isBlocked(location.getX(), location.getY()),
      isWater: (location) => map.water.has(tileKey(location.getX(), location.getY())),
    },
    MapObjects: { getObjectsAt: (location) => map.objects.filter((object) => object.getLocation().equals(location)) },
    ObjectManager: { objectsAt: () => [] },
  };
  HolidayTool.register({
    core,
    onItemAction(name, handlers) {
      assert.equal(name, "Holiday tool");
      Object.assign(actions, handlers);
    },
  });
});

beforeEach(() => {
  grounds.length = 0;
  map = { blocked: new Set(), water: new Set(), objects: [] };
});

function createPlayer({ rights = "OWNER" } = {}) {
  const messages = [];
  let menu = null;
  let prompt = null;
  const player = {
    messages,
    chatbox: [],
    promptText: null,
    get menu() { return menu; },
    get prompt() { return prompt; },
    setEnteredAmountAction(action) { prompt = action; },
    getRights: () => core.PlayerRights[rights],
    sendMessage: (text) => messages.push(text),
    getLocation: () => new core.Location(ORIGIN[0], ORIGIN[1], 0),
    getPrivateArea: () => null,
    getDialogueManager: () => ({
      startDialogues(chain) { menu = [...chain.getDialogues().values()][0]; },
      reset() { menu = null; },
    }),
    getPacketSender: () => ({
      sendInterfaceRemoval() { player.chatbox.push("close"); },
      sendEnterAmountPrompt(text) { player.promptText = text; player.chatbox.push("prompt"); },
    }),
  };
  return player;
}

const names = (drops) => new Set(drops.map((drop) => core.CacheDefinitions.getItem(drop.getItem().getId()).name));

test("the cache gives the Holiday tool its Spawn Item option", () => {
  assert.equal(core.CacheDefinitions.getItem(core.ItemIdentifiers.HOLIDAY_TOOL).inventoryActions?.[0], "Spawn Item");
});

test("players below owner are refused", () => {
  const player = createPlayer({ rights: "ADMINISTRATOR" });
  actions["Spawn Item"]({ player });
  assert.equal(player.menu, null);
  assert.deepEqual(player.messages, ["Nothing interesting happens."]);
});

test("Spawn Item asks which holiday", () => {
  const player = createPlayer();
  actions["Spawn Item"]({ player });
  assert.equal(player.menu.getTitle(), "Choose a holiday to spawn items:");
  assert.deepEqual(player.menu.getOptions(), ["Easter", "Halloween", "Christmas"]);
});

test("every holiday's items are tradeable rares from the cache", () => {
  for (const holiday of HolidayTool.HOLIDAYS) {
    for (const name of holiday.items) {
      const id = core.ItemIdentifiers[name];
      assert.ok(Number.isInteger(id), `${name} is an item`);
      assert.equal(core.ItemDefinition.forId(id).isTradeable(), true, `${name} is tradeable`);
    }
  }
});

/** Spawn Item, then the holiday at menu position `index` (1-based), then `amount` typed in the prompt. */
function spawn(player, index, amount) {
  actions["Spawn Item"]({ player });
  player.menu.execute(index);
  assert.equal(player.menu, null, "the holiday menu closed");
  assert.deepEqual(player.chatbox.slice(-2), ["close", "prompt"], "the chatbox closes, then the prompt opens");
  assert.equal(player.promptText, "How many items would you like to spawn?");
  player.prompt.execute(amount);
}

test("each holiday asks how many, then spawns that many of its own items, seen by everyone", () => {
  const expected = {
    Easter: ["Easter egg"],
    Halloween: ["Red halloween mask", "Blue halloween mask", "Green halloween mask", "Pumpkin"],
    Christmas: ["Christmas cracker", "Santa hat", "Red partyhat", "Yellow partyhat", "Blue partyhat", "Green partyhat", "Purple partyhat", "White partyhat"],
  };
  for (const [index, [holiday, items]] of Object.entries(expected).entries()) {
    const player = createPlayer();
    const seen = new Set();
    for (let i = 0; i < 50; i++) {
      grounds.length = 0;
      spawn(player, index + 1, 20);
      assert.equal(grounds.length, 20);
      for (const name of names(grounds)) seen.add(name);
      assert.ok(grounds.every((drop) => drop.getState() === core.GroundItemState.SEEN_BY_EVERYONE));
      assert.equal(player.messages.at(-1), `You spawn 20 ${holiday} items.`);
    }
    assert.deepEqual([...seen].sort(), [...items].sort(), `${holiday} spawns only, and all of, its items`);
  }
});

test("the amount typed is the amount spawned, at most 50, and nothing below 1", () => {
  const player = createPlayer();
  for (const [typed, dropped] of [[1, 1], [7, 7], [50, 50], [51, 50], [2147483647, 50], [0, 0]]) {
    grounds.length = 0;
    player.messages.length = 0;
    spawn(player, 3, typed);
    assert.equal(grounds.length, dropped, `typed ${typed}`);
  }
  assert.deepEqual(player.messages, [], "typing 0 spawns nothing and says nothing");
  spawn(player, 2, 1);
  assert.equal(player.messages.at(-1), "You spawn 1 Halloween item.");
});

test("items land within 10 tiles, never on the player's tile, each on a tile of its own", () => {
  const player = createPlayer();
  const landed = new Set();
  for (let i = 0; i < 100; i++) {
    const drops = Spawns.spawnRares(core, player, [core.ItemIdentifiers.SANTA_HAT], 50);
    const tiles = drops.map((drop) => at(drop.getPosition()));
    assert.equal(new Set(tiles).size, 50, "no two share a tile while there is room");
    for (const drop of drops) {
      const tile = drop.getPosition();
      assert.ok(Math.abs(tile.getX() - ORIGIN[0]) <= 10 && Math.abs(tile.getY() - ORIGIN[1]) <= 10, `within the square: ${at(tile)}`);
      assert.notEqual(at(tile), tileKey(...ORIGIN));
      landed.add(at(tile));
    }
  }
  assert.ok(landed.size > 300, `spread over the 21 by 21 square: ${landed.size} tiles`);
});

test("items never land on trees, water, or floor the player can't walk to", () => {
  const player = createPlayer();
  scenery("Tree", 3224, 3218);
  scenery("Oak tree", 3220, 3220, { sizeX: 2, sizeY: 2 });
  for (let x = 3212; x <= 3232; x++) map.water.add(tileKey(x, 3214));
  // A fenced pen to the north-east: open inside, but walled all round.
  for (let x = 3224; x <= 3227; x++) { map.blocked.add(tileKey(x, 3220)); map.blocked.add(tileKey(x, 3223)); }
  for (let y = 3220; y <= 3223; y++) { map.blocked.add(tileKey(3224, y)); map.blocked.add(tileKey(3227, y)); }
  scenery("Flowers", 3219, 3217, { type: 22, blocks: false });
  scenery("Crate", 3217, 3216, { blocks: false });
  const tiles = new Set(Spawns.spawnTiles(core, player).map(at));
  for (const tree of ["3224,3218", "3220,3220", "3221,3221"]) assert.ok(!tiles.has(tree), `not on a tree: ${tree}`);
  for (let x = 3212; x <= 3232; x++) assert.ok(!tiles.has(tileKey(x, 3214)), "not in water");
  for (const pen of ["3225,3221", "3226,3222"]) assert.ok(!tiles.has(pen), `not in the closed pen: ${pen}`);
  assert.ok(!tiles.has("3217,3216"), "not on scenery standing on the tile");
  assert.ok(tiles.has("3219,3217"), "flowers are flat ground");
  assert.ok(tiles.has("3232,3228") && tiles.has("3212,3215"), "open floor out to 10 tiles");
  // Water is walkable in this map, but the walk crosses it: past it, floor is still reached.
  assert.ok(tiles.has("3222,3210"), "floor beyond the water");
});

test("items can land on a table the player can reach, not on one walled in", () => {
  const player = createPlayer();
  scenery("Table", 3224, 3219, { sizeX: 2 });
  for (const [x, y] of [[3218, 3222], [3218, 3224], [3217, 3223], [3219, 3223]]) map.blocked.add(tileKey(x, y));
  scenery("Long table", 3218, 3223);
  const tiles = new Set(Spawns.spawnTiles(core, player).map(at));
  assert.ok(tiles.has("3224,3219") && tiles.has("3225,3219"), "both table tiles");
  assert.ok(!tiles.has("3218,3223"), "not the walled-in table");
});

test("items share tiles only when there are more items than tiles", () => {
  const player = createPlayer();
  // A 3 by 1 corridor east of the player: three spawn tiles.
  for (let x = 3211; x <= 3233; x++) for (let y = 3207; y <= 3229; y++) map.blocked.add(tileKey(x, y));
  for (const x of [3222, 3223, 3224, 3225]) map.blocked.delete(tileKey(x, 3218));
  const drops = Spawns.spawnRares(core, player, [core.ItemIdentifiers.PUMPKIN], 7);
  const counts = {};
  for (const drop of drops) counts[at(drop.getPosition())] = (counts[at(drop.getPosition())] ?? 0) + 1;
  assert.deepEqual(Object.keys(counts).sort(), ["3223,3218", "3224,3218", "3225,3218"]);
  assert.deepEqual(Object.values(counts).sort(), [2, 2, 3]);
});

test("a player boxed in by trees gets every item on their own tile", () => {
  const player = createPlayer();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) map.blocked.add(tileKey(ORIGIN[0] + dx, ORIGIN[1] + dy));
  const drops = Spawns.spawnRares(core, player, [core.ItemIdentifiers.EASTER_EGG], 5);
  assert.deepEqual(drops.map((drop) => at(drop.getPosition())), Array(5).fill(tileKey(...ORIGIN)));
});
