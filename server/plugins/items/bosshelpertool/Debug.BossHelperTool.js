"use strict";

/**
 * Boss helper tool > Debug (Wiki, Boss helper tool): "opens an interface with various handy options". These are the
 * Teleports and All Gear of the Desert Treasure II beta and the Swap Spellbook, Set Stats and Unlock Everything of
 * the 2024 betas. The menu's title is ours.
 *
 * Swap Spellbook "presents the same chat options as the Venerate option on an occult altar" (Altars'
 * "altars:venerate-occult"), so the same spellbook unlocks apply.
 */
const Common = require("./Common.BossHelperTool");
const Teleports = require("./Teleports.BossHelperTool");
const Supplies = require("./Supplies.BossHelperTool");
const Stats = require("./Stats.BossHelperTool");
const Unlock = require("./Unlock.BossHelperTool");

const TITLE = "Boss helper tool";

function swapSpellbook(player) {
  const request = { player, handled: false };
  Common.getApi().emitCustomEvent("altars:venerate-occult", request);
  if (!request.handled) player.sendMessage(Common.REFUSAL);
}

const ENTRIES = [
  ["Teleports", Teleports.open],
  ["All Gear", Supplies.open],
  ["Swap Spellbook", swapSpellbook],
  ["Set Stats", Stats.open],
  ["Unlock Everything", Unlock.unlockEverything],
];

function debug({ player }) {
  if (!Common.permitted(player)) return;
  Common.menu(player, TITLE, ENTRIES);
}

module.exports = function attach(api) {
  api.onItemAction(Common.TOOL_NAME, { Debug: debug });
  api.onInterfaceActionClick(Common.chooseFromMenu);
};
Object.assign(module.exports, { TITLE, ENTRIES, debug, swapSpellbook });
