"use strict";

/**
 * Boss helper tool > Debug > Set Stats (Wiki, Boss helper tool, 2024 betas): "Set which skill?", usable anywhere.
 * Raising a skill shows an experience drop for the experience it gained; Hitpoints can't go below 10.
 *
 * The Wiki's list is a chatbox menu of every skill with its level. Here it's the genie lamp's skill grid (XpReward's
 * "xpreward:open", interface 240) under the same title, every skill on offer whatever the player has unlocked: pick a
 * skill, Confirm, then type the level. Ours: the level prompt's text and the grid opening again after each skill,
 * so the next can be set. Levels are set the way ::setlevel sets them (boosts and drains go too).
 */
const Common = require("./Common.BossHelperTool");

const TITLE = "Set which skill?";
const MAX_LEVEL = 99;
const MIN_HITPOINTS = 10;

function open(player) {
  Common.getApi().emitCustomEvent("xpreward:open", {
    player, title: TITLE, minLevel: 0, unlocks: false,
    onConfirm(skill, name) {
      // The grid closes after this returns, and would take a prompt opened now with it.
      queueMicrotask(() => askLevel(player, skill, name));
      return null;
    },
  });
}

/** `name` is the cache's name for the skill ("Runecraft"). */
function askLevel(player, skill, name = skill.getName()) {
  const current = player.getSkillManager().getMaxLevel(skill);
  Common.askNumber(player, `Set ${name} (now ${current}) to which level?`, (level) => {
    if (setStat(player, skill, level, name)) open(player);
  });
}

/** Sets the skill's level and experience; false (with a message) for a level out of range. */
function setStat(player, skill, level, name = skill.getName()) {
  const { Skill, SkillManager, WeaponInterfaceManager, Flag } = Common.getCore();
  const minimum = skill === Skill.HITPOINTS ? MIN_HITPOINTS : 1;
  if (!Number.isInteger(level) || level < minimum || level > MAX_LEVEL) {
    player.sendMessage(`${name} can be set from ${minimum} to ${MAX_LEVEL}.`);
    return false;
  }
  const manager = player.getSkillManager();
  const before = manager.getExperience(skill);
  const experience = SkillManager.getExperienceForLevel(level);
  manager.setCurrentLevels(skill, level).setMaxLevel(skill, level).setExperience(skill, experience);
  if (experience > before) player.getPacketSender().sendExpDrop(skill, experience - before);
  WeaponInterfaceManager.assign(player);
  player.getUpdateFlag().flag(Flag.APPEARANCE);
  return true;
}

module.exports = { TITLE, MIN_HITPOINTS, open, askLevel, setStat };
