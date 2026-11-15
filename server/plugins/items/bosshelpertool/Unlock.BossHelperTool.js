"use strict";

/**
 * Boss helper tool > Debug > Unlock Everything (Wiki, Boss helper tool, 2024 betas): "all quests, miniquests, and
 * Achievement Diaries will be fully completed, and the player-owned house will be fully furnished and moved to
 * Rimmington."
 *
 * Each through the plugin that owns it: QuestCommand's "quest:auto-complete-all" (stages and quest points, without
 * the rewards, scrolls or announcements), AchievementDiaries' "diary:complete-all" (every task, rewards left to
 * claim) and Construction's "construction:max-house" (the ::maxhouse house, saved at Rimmington while the player
 * stays where they are; ::restorehouse brings the old one back). The closing message is ours.
 */
const Common = require("./Common.BossHelperTool");

/** house-locations.json's Rimmington. */
const RIMMINGTON = 1;

function unlockEverything(player) {
  const api = Common.getApi();
  const quests = { player, completed: 0 };
  api.emitCustomEvent("quest:auto-complete-all", quests);
  const diaries = { player, completed: 0 };
  api.emitCustomEvent("diary:complete-all", diaries);
  const house = { player, location: RIMMINGTON, handled: false };
  api.emitCustomEvent("construction:max-house", house);
  api.emitCustomEvent("persistence:save", { player, reason: "boss-helper-tool-unlock" });
  player.sendMessage(`Unlocked: ${quests.completed} quests, ${diaries.completed} diary tasks${house.handled ? ", and a furnished house in Rimmington" : ""}.`);
  return { quests: quests.completed, diaries: diaries.completed, house: house.handled };
}

module.exports = { RIMMINGTON, unlockEverything };
