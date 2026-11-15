"use strict";

/**
 * Holiday tool (item 11996, "Spawns an allowance of holiday items each day."): Jagex moderators' item,
 * here for owners and developers. Spawn Item asks which holiday and how many items, then scatters that
 * many of the holiday's tradeable rares (up to MAX_ITEMS), each picked at random, on floor and tables the
 * player can reach up to 10 tiles away (holidaytool/Spawns.HolidayTool.js). Anyone else gets
 * "Nothing interesting happens." Docs: docs/holiday-tool.md.
 */
const Spawns = require("./holidaytool/Spawns.HolidayTool");

const TOOL_NAME = "Holiday tool";
const REFUSAL = "Nothing interesting happens.";
const TITLE = "Choose a holiday to spawn items:";
const AMOUNT_PROMPT = "How many items would you like to spawn?";
/** The most one spawn drops: a larger amount is cut to it. */
const MAX_ITEMS = 50;
/** Each holiday's tradeable rares, by ItemIdentifiers name. */
const HOLIDAYS = [
  { name: "Easter", items: ["EASTER_EGG"] },
  { name: "Halloween", items: ["RED_HALLOWEEN_MASK", "BLUE_HALLOWEEN_MASK", "GREEN_HALLOWEEN_MASK", "PUMPKIN"] },
  {
    name: "Christmas",
    items: [
      "CHRISTMAS_CRACKER", "SANTA_HAT", "RED_PARTYHAT", "YELLOW_PARTYHAT", "BLUE_PARTYHAT", "GREEN_PARTYHAT",
      "PURPLE_PARTYHAT", "WHITE_PARTYHAT",
    ],
  },
];

let core = null;

function permitted(player) {
  if (player?.getRights?.()?.getId?.() >= core.PlayerRights.OWNER.getId()) return true;
  player?.sendMessage?.(REFUSAL);
  return false;
}

function holidayItemIds(holiday) {
  return holiday.items.map((name) => core.ItemIdentifiers[name]).filter(Number.isInteger);
}

function spawnItem({ player }) {
  if (!permitted(player)) return;
  const chain = new core.DialogueChainBuilder();
  chain.add(new core.OptionDialogue(0, {
    executeOption(option) {
      // Close the chatbox first, or the picked option stays on "Please wait...".
      player.getDialogueManager().reset();
      player.getPacketSender().sendInterfaceRemoval();
      const holiday = HOLIDAYS[Number(option) - 1];
      if (holiday) askAmount(player, holiday);
    },
  }, ...HOLIDAYS.map(({ name }) => name)).setTitle(TITLE));
  player.getDialogueManager().startDialogues(chain);
}

/** The "Enter amount" prompt for how many of the holiday's rares to spawn. */
function askAmount(player, holiday) {
  player.setEnteredAmountAction({ execute: (amount) => spawnHoliday(player, holiday, amount) });
  player.getPacketSender().sendEnterAmountPrompt(AMOUNT_PROMPT);
}

/** Scatters `amount` of the holiday's rares (at most MAX_ITEMS) around the player; nothing for less than 1. */
function spawnHoliday(player, holiday, amount, random = Math.random) {
  const count = Math.min(MAX_ITEMS, Math.floor(Number(amount)));
  if (!(count >= 1)) return [];
  const drops = Spawns.spawnRares(core, player, holidayItemIds(holiday), count, random);
  player.sendMessage(`You spawn ${drops.length} ${holiday.name} item${drops.length === 1 ? "" : "s"}.`);
  return drops;
}

module.exports = {
  name: "HolidayTool",
  description: "The Holiday tool, for owners and developers: Spawn Item scatters as many Easter, Halloween or Christmas rares as asked for (up to 50) on reachable floor and tables around the player.",
  HOLIDAYS,
  MAX_ITEMS,
  spawnHoliday,
  register(api) {
    core = api.core;
    api.onItemAction(TOOL_NAME, { "Spawn Item": spawnItem });
  },
};
