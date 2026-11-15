"use strict";

/**
 * What every Boss helper tool unit shares: who may use it, and its menus.
 *
 * The tool's menus are the cache's scrolling chatbox menu (187 through script 217, as the Wilderness obelisks and
 * the transformation rings open it): the Wiki lists the Set Stats entries with that menu's keys, #1 to #9 then #A
 * on. A choice arrives as menu:lj_layer1's pause button, its sub the entry's index.
 */

const TOOL_NAME = "Boss helper tool";
const REFUSAL = "Nothing interesting happens.";
const MAIN_MODAL = (161 << 16) | 16;
const MENU_GROUP = 187;
const MENU_CHOICES = (MENU_GROUP << 16) | 3;
const MENU_SCRIPT = 217;
const SCRIPT_MAINMODAL_OPEN = 2524;

let api = null;
let core = null;
/** The menu each player has open: { entries: [[label, handler]], mount }. */
const menus = new WeakMap();

function init(pluginApi) {
  api = pluginApi;
  core = pluginApi.core;
}

const getApi = () => api;
const getCore = () => core;

/** On live it's handed to everyone on a beta world; here, as the other moderator tools, owners and developers. */
function permitted(player) {
  if (player?.getRights?.()?.getId?.() >= core.PlayerRights.OWNER.getId()) return true;
  player?.sendMessage?.(REFUSAL);
  return false;
}

/** Opens the menu: `entries` are [label, handler] pairs, each handler given the player. */
function menu(player, title, entries) {
  const sender = player.getPacketSender();
  sender.sendClientScript(SCRIPT_MAINMODAL_OPEN, -1, -1).sendInterface(MENU_GROUP);
  menus.set(player, { entries, mount: sender.getSubInterfaceAt(MAIN_MODAL) });
  sender.sendClientScript(MENU_SCRIPT, title, entries.map(([label]) => label).join("|"), 1);
  sender.sendInterfaceFlagsRange(MENU_CHOICES, 0, entries.length - 1, 1);
}

/** A choice in a menu this tool opened, while it's still the one open: closes it and runs the entry. */
function chooseFromMenu(event) {
  if (event.buttonId !== MENU_CHOICES) return;
  const { player } = event;
  const state = menus.get(player);
  const sender = player.getPacketSender();
  if (!state || sender.getSubInterfaceAt(MAIN_MODAL) !== state.mount) return;
  event.handled = true;
  const entry = state.entries[event.slot ?? event.action];
  if (!entry) return;
  menus.delete(player);
  sender.sendInterfaceRemoval();
  entry[1](player);
}

/** The "Enter amount" prompt; `accept` gets the whole number typed. */
function askNumber(player, prompt, accept) {
  player.setEnteredAmountAction({ execute: (amount) => accept(Math.floor(Number(amount))) });
  player.getPacketSender().sendEnterAmountPrompt(prompt);
}

/** An obj's id by its gameval name, or null when this cache has none. */
function objId(name) {
  const id = core.CacheDefinitions.getObjId(name);
  return Number.isInteger(id) && id >= 0 ? id : null;
}

module.exports = {
  TOOL_NAME, REFUSAL, MAIN_MODAL, MENU_CHOICES, init, getApi, getCore, permitted, menu, chooseFromMenu, askNumber, objId,
};
