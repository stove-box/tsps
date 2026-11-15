"use strict";

/**
 * Where the Holiday tool's rares land, and dropping them.
 *
 * A rare lands on a random tile up to SPAWN_RADIUS from the player, and only where the player could
 * pick it up: open floor they can walk to, or a table they can reach. A walk from the player's tile,
 * one collision-checked step at a time, finds the floor. Trees, rocks, water, walls and anything
 * fenced off are never reached. A tile counts as open floor when nothing stands on it but wall edges
 * and ground decoration (flowers, rubble). Tables are scenery named "table" with a reached tile beside
 * them. Each rare of a spawn takes a tile of its own until every spawn tile holds one; only then do they
 * share. The Rotten potato's Spawn RARE! finds its tiles the same way.
 */

/** Tiles each way from the player a rare may land. */
const SPAWN_RADIUS = 10;
/** A dropped item's lifetime: it doesn't come back once taken. */
const NO_RESPAWN = -1;
const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const CARDINAL = STEPS.slice(0, 4);
/** Loc shapes 0-8 are walls and wall decoration on a tile's edge; 22 is ground decoration. */
const LAST_WALL_SHAPE = 8;
const GROUND_DECORATION = 22;
const TABLE = /\btable\b/i;

const key = (x, y) => `${x},${y}`;
const areaOf = (player) => player.getPrivateArea?.() ?? null;

/** Every tile within SPAWN_RADIUS the player can walk to from where they stand, as "x,y" -> [x, y]. */
function reachableTiles(core, player) {
  const origin = player.getLocation();
  const ox = origin.getX(), oy = origin.getY(), z = origin.getZ();
  const area = areaOf(player);
  const reached = new Map([[key(ox, oy), [ox, oy]]]);
  const queue = [[ox, oy]];
  for (let next = 0; next < queue.length; next++) {
    const [x, y] = queue[next];
    for (const [dx, dy] of STEPS) {
      const nx = x + dx, ny = y + dy;
      if (Math.abs(nx - ox) > SPAWN_RADIUS || Math.abs(ny - oy) > SPAWN_RADIUS || reached.has(key(nx, ny))) continue;
      if (!core.RegionManager.canMove(x, y, nx, ny, z, 1, 1, area)) continue;
      reached.set(key(nx, ny), [nx, ny]);
      queue.push([nx, ny]);
    }
  }
  return reached;
}

/** The map's and the server's own objects on a tile, in the player's world or instance. */
function objectsOn(core, player, location) {
  const area = areaOf(player);
  return [
    ...core.MapObjects.getObjectsAt(location, area),
    ...core.ObjectManager.objectsAt(location).filter((object) => object.getPrivateArea() === area),
  ];
}

function isOpenFloor(core, player, location) {
  if (core.RegionManager.isWater(location)) return false;
  return objectsOn(core, player, location)
    .every((object) => object.getType() <= LAST_WALL_SHAPE || object.getType() === GROUND_DECORATION);
}

/** The tiles a table covers, turned as it stands. */
function footprint(object) {
  const at = object.getLocation();
  const definition = object.getDefinition();
  const turned = (object.getFace() & 1) === 1;
  const width = Math.max(1, (turned ? definition?.getSizeY() : definition?.getSizeX()) ?? 1);
  const length = Math.max(1, (turned ? definition?.getSizeX() : definition?.getSizeY()) ?? 1);
  const tiles = [];
  for (let dx = 0; dx < width; dx++) for (let dy = 0; dy < length; dy++) tiles.push([at.getX() + dx, at.getY() + dy]);
  return tiles;
}

/** Table tiles within SPAWN_RADIUS that a reached tile stands beside. */
function tableTiles(core, player, reached) {
  const origin = player.getLocation();
  const within = ([x, y]) => Math.abs(x - origin.getX()) <= SPAWN_RADIUS && Math.abs(y - origin.getY()) <= SPAWN_RADIUS;
  const tiles = new Map();
  for (let dx = -SPAWN_RADIUS; dx <= SPAWN_RADIUS; dx++) {
    for (let dy = -SPAWN_RADIUS; dy <= SPAWN_RADIUS; dy++) {
      const at = new core.Location(origin.getX() + dx, origin.getY() + dy, origin.getZ());
      for (const object of objectsOn(core, player, at)) {
        if (!TABLE.test(object.getDefinition()?.getName?.() ?? "") || !object.getLocation().equals(at)) continue;
        const covered = footprint(object).filter(within);
        const beside = covered.some(([x, y]) => CARDINAL.some(([sx, sy]) => reached.has(key(x + sx, y + sy))));
        if (beside) for (const [x, y] of covered) tiles.set(key(x, y), [x, y]);
      }
    }
  }
  return tiles;
}

/** Where a rare may land around the player: reached open floor (not their own tile) and reachable tables. */
function spawnTiles(core, player) {
  const origin = player.getLocation();
  const z = origin.getZ();
  const reached = reachableTiles(core, player);
  const tiles = [...reached.values()]
    .filter(([x, y]) => x !== origin.getX() || y !== origin.getY())
    .map(([x, y]) => new core.Location(x, y, z))
    .filter((location) => isOpenFloor(core, player, location));
  for (const [x, y] of tableTiles(core, player, reached).values()) tiles.push(new core.Location(x, y, z));
  return tiles;
}

function shuffle(list, random) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/**
 * Drops one of `itemIds`, picked at random each time, for each of `count` rares, seen by everyone. They
 * take shuffled spawn tiles, one each until every tile holds one, or the player's own tile when there is
 * none. Returns the drops.
 */
function spawnRares(core, player, itemIds, count, random = Math.random) {
  const tiles = shuffle(spawnTiles(core, player), random);
  if (!tiles.length) tiles.push(player.getLocation().clone());
  const drops = [];
  for (let i = 0; i < count; i++) {
    const item = new core.Item(itemIds[Math.floor(random() * itemIds.length)], 1);
    const drop = new core.ItemOnGround(
      core.GroundItemState.SEEN_BY_EVERYONE, undefined, tiles[i % tiles.length].clone(), item, false, NO_RESPAWN, areaOf(player),
    );
    core.ItemOnGroundManager.register(drop);
    drops.push(drop);
  }
  return drops;
}

module.exports = { SPAWN_RADIUS, spawnTiles, spawnRares };
