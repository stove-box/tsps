"use strict";

/**
 * Boss helper tool > Debug > Teleports (Wiki, Boss helper tool): the Boss list, every boss, raid and Ferox Enclave.
 * A destination teleports the player there "alongside essential entry items", sets "the relevant slayer task for
 * the boss, if applicable", and completes the quest its area is locked behind "without its prerequisites". It works
 * up to level 20 Wilderness (TeleportHandler.checkReqs). The destinations are plugins/items/data/boss-helper-tool.json.
 *
 * Ours, with no capture to go by: the list is a grid with each boss's icon (Layout.BossHelperTool.js) where the beta's
 * was a chatbox menu, the teleport is the standard spell's, and a Boss task is BOSS_TASK_KILLS kills.
 */
const fs = require("fs");
const path = require("path");
const Common = require("./Common.BossHelperTool");
const Layout = require("./Layout.BossHelperTool");

const { GROUP_ID, MAIN_MODAL_UID, COMPONENT, ROW_SLOTS, uid } = Layout;
const TITLE = "Boss list";
/** The most kills a Boss task can be (Wiki, Boss task: 3-35). */
const BOSS_TASK_KILLS = 35;
const TASK_KILLS = 1;
const ROW_UIDS = Array.from({ length: ROW_SLOTS }, (_, slot) => uid(COMPONENT.ROW_LABEL_START + slot));
/** Row ids count from 1: the custom-interface runtime leaves out a row whose id is 0. */
const DESTINATIONS = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "boss-helper-tool.json"), "utf8"))
  .destinations.map((entry, index) => ({ ...entry, id: index + 1 }));
const byId = (id) => DESTINATIONS[id - 1];
const INTERFACE_DEFINITION = Layout.buildInterface();

let rows = null;

/** Every destination's row for the grid, its icon resolved from the cache once. */
function catalog() {
  rows ??= JSON.stringify(DESTINATIONS.map(({ id, name, icon }) => ({ id, name, icon: Common.objId(icon) ?? -1 })));
  return rows;
}

const isOpen = (player) => player.getInterfaceId?.() === GROUP_ID;

function open(player) {
  const sender = player.getPacketSender();
  player.setInterfaceId(GROUP_ID);
  sender.sendSubInterface(MAIN_MODAL_UID, GROUP_ID, 0, { postScripts: [{ scriptId: 227, args: [uid(COMPONENT.FRAME), TITLE] }] });
  sender.sendString(catalog(), uid(COMPONENT.DATA));
  // The search box keeps what was typed last time it was open: start empty.
  player.getFrameUpdater?.()?.clear?.(uid(COMPONENT.SEARCH_INPUT));
  sender.sendString("", uid(COMPONENT.SEARCH_INPUT));
}

/** A grid cell: the click's slot is the destination's row id. */
function clickRow({ player, slot }) {
  if (!isOpen(player)) return false;
  const entry = byId(slot);
  if (!entry) return true;
  player.getPacketSender().sendInterfaceRemoval();
  teleport(player, entry);
  return true;
}

/** Where a destination lands now: its tile, or what its plugin answers for a live one (the Corporeal Beast's cave). */
function tileOf(player, entry) {
  if (!entry.live) return entry.tile;
  const request = { player };
  Common.getApi().emitCustomEvent(entry.live, request);
  return request.tile === undefined ? entry.tile : request.tile;
}

function teleport(player, entry) {
  const core = Common.getCore();
  const tile = tileOf(player, entry);
  if (!tile) {
    player.sendMessage("You can't teleport there right now.");
    return;
  }
  const destination = new core.Location(tile[0], tile[1], tile[2] ?? 0);
  if (!core.TeleportHandler.checkReqs(player, destination)) return;
  core.TeleportHandler.confirm(player, destination, () => {
    prepare(player, entry);
    core.TeleportHandler.teleport(player, destination, core.TeleportType.NORMAL, false);
  });
}

/** What the destination needs: its quests done, its Slayer task set and its entry items carried. */
function prepare(player, entry) {
  for (const key of entry.quests ?? []) completeQuest(player, key);
  if (entry.boss || entry.task) assignTask(player, entry);
  for (const name of entry.items ?? []) giveItem(player, name);
}

function completeQuest(player, key) {
  Common.getApi().emitCustomEvent("quest:auto-complete", { player, key, completed: false });
}

function assignTask(player, entry) {
  const amount = entry.boss ? BOSS_TASK_KILLS : TASK_KILLS;
  const request = { player, boss: entry.boss, task: entry.task, amount, assigned: null };
  Common.getApi().emitCustomEvent("slayer:assign-task", request);
  if (request.assigned) player.sendMessage(`Your new task is to kill ${amount} ${request.assigned}.`);
}

/** Carried already (in the inventory or worn), or added; one that doesn't fit lands at the player's feet. */
function giveItem(player, name) {
  const id = Common.objId(name);
  if (id === null) return;
  const carried = [...player.getInventory().getItems(), ...player.getEquipment().getItems()].some((item) => item?.getId?.() === id);
  if (carried) return;
  const item = new (Common.getCore().Item)(id, 1);
  const inventory = player.getInventory();
  if (typeof inventory.forceAdd === "function") inventory.forceAdd(player, item);
  else inventory.add(item);
}

module.exports = function attach(api) {
  api.registerCustomInterface(INTERFACE_DEFINITION);
  api.onInterfaceActionButton(ROW_UIDS, clickRow);
};
Object.assign(module.exports, { DESTINATIONS, BOSS_TASK_KILLS, open, teleport, prepare, clickRow });
