"use strict";

/**
 * Boss helper tool (item 3667, "A tool to teleport you to various bosses and setup slayer tasks."): the beta worlds'
 * testing tool, here for owners and developers. Debug opens its menu (bosshelpertool/Debug.BossHelperTool.js):
 * Teleports (the Boss list), All Gear (the supplies table), Swap Spellbook, Set Stats and Unlock Everything, a unit
 * each in ./bosshelpertool/. Docs: docs/boss-helper-tool.md.
 */
const Common = require("./bosshelpertool/Common.BossHelperTool");

module.exports = {
  name: "BossHelperTool",
  description: "The Boss helper tool, for owners and developers: teleports to every boss with its entry items, Slayer task and quest, the supplies table, spellbook swaps, set stats and unlock everything.",
  register(api) {
    Common.init(api);
    require("./bosshelpertool/Debug.BossHelperTool")(api);
    require("./bosshelpertool/Teleports.BossHelperTool")(api);
    require("./bosshelpertool/Supplies.BossHelperTool")(api);
  },
};
