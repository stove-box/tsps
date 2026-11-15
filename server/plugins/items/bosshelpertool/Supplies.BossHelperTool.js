"use strict";

/**
 * Boss helper tool > Debug > All Gear (Wiki, Boss helper tool): "When in proximity to a bank, opens the same interface
 * as the supplies table found in Ferox Enclave", else "You need to be near a bank to use this feature".
 *
 * That's the cache's tournament_supplies (100). Its own onload script (962) draws the Items tab from enum 1124: one
 * slot per item under component 4, each with Take, and Take-5, Take-10 and Take-X when it stacks, and Examine. A
 * click comes back as that component with the item's index as the slot. Script 962 adds enum 1906's items after them
 * only on worlds whose type varp (3717) has bits 25 and 23 set and 4 clear, which this server never sends.
 *
 * Not covered: the Load-outs tab. The client draws it from inventory 207 and the server's load-out list, and there's
 * no capture of either, so it opens empty. "Near a bank" is the league's answer (`league:near-bank`: a bank booth,
 * chest or banker within 8 tiles).
 */
const Common = require("./Common.BossHelperTool");

const GROUP = 100;
const ITEMS = (GROUP << 16) | 4;
const ITEMS_ENUM = 1124;
const OP = { TAKE: 1, TAKE_5: 2, TAKE_10: 3, TAKE_X: 4, EXAMINE: 10 };
const AMOUNTS = { [OP.TAKE]: 1, [OP.TAKE_5]: 5, [OP.TAKE_10]: 10 };
/** The ops script 962 gives the slots: 1-4 and 10. */
const ITEM_EVENTS = (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 10);
const NOT_NEAR_BANK = "You need to be near a bank to use this feature";
const NO_ROOM = "You don't have enough inventory space.";

let items = null;

/** The Items tab's objs in slot order, as script 962 lays them out. */
function supplyItems() {
  items ??= [...Common.getCore().CacheDefinitions.getEnumValues(ITEMS_ENUM).entries()]
    .sort(([a], [b]) => a - b).map(([, id]) => Number(id)).filter((id) => id >= 0);
  return items;
}

function nearBank(player) {
  const query = { player, near: false };
  Common.getApi().emitCustomEvent("league:near-bank", query);
  return query.near === true;
}

const isOpen = (player) => player.getInterfaceId?.() === GROUP;

function open(player) {
  if (!nearBank(player)) {
    player.sendMessage(NOT_NEAR_BANK);
    return;
  }
  const sender = player.getPacketSender();
  sender.sendClientScript(2524, -1, -1).sendInterface(GROUP);
  sender.sendInterfaceFlagsRange(ITEMS, 0, supplyItems().length - 1, ITEM_EVENTS);
}

function clickItem({ player, slot, opId }) {
  if (!isOpen(player)) return false;
  const id = supplyItems()[slot];
  if (id === undefined) return true;
  if (opId === OP.EXAMINE) {
    Common.getCore().examineItem(player, id, 1);
  } else if (opId === OP.TAKE_X) {
    Common.askNumber(player, "Enter amount:", (amount) => take(player, id, amount));
  } else if (AMOUNTS[opId]) {
    take(player, id, AMOUNTS[opId]);
  }
  return true;
}

/** As many as fit, at most `amount`; only a stackable can be taken more than one at a time. */
function take(player, id, amount) {
  if (!isOpen(player) || !(amount >= 1)) return;
  const { Item, ItemDefinition } = Common.getCore();
  const stackable = ItemDefinition.forId(id).isStackable();
  const inventory = player.getInventory();
  const fits = inventory.getAddableAmount(new Item(id, stackable ? amount : 1));
  if (fits <= 0) {
    player.sendMessage(NO_ROOM);
    return;
  }
  inventory.add(new Item(id, fits), true);
}

module.exports = function attach(api) {
  api.onInterfaceActionButton(ITEMS, clickItem);
};
Object.assign(module.exports, { GROUP, ITEMS_ENUM, NOT_NEAR_BANK, open, clickItem, take, supplyItems });
