"use strict";

/**
 * Boss helper tool > Debug > Set Stats (Wiki, Boss helper tool, 2024 betas): "Set which skill?", a list of every
 * skill with its current level in parentheses after "(Cancel)", usable anywhere. Raising a skill shows an experience
 * drop for the experience it gained; Hitpoints can't go below 10.
 *
 * Ours: the level prompt's text, the menu opening again after each skill so the next can be set, and Sailing, newer
 * than the Wiki's list, at its end. Levels are set the way ::setlevel sets them (boosts and drains go too).
 */
const Common = require("./Common.BossHelperTool");

const TITLE = "Set which skill?";
const CANCEL = "(Cancel)";
const PROMPT = "Enter a level:";
const MAX_LEVEL = 99;
const MIN_HITPOINTS = 10;
/** The Wiki's order. */
const SKILLS = [
  "ATTACK", "STRENGTH", "RANGED", "MAGIC", "DEFENCE", "HITPOINTS", "PRAYER", "AGILITY", "HERBLORE", "THIEVING",
  "CRAFTING", "RUNECRAFTING", "MINING", "SMITHING", "FISHING", "COOKING", "FIREMAKING", "WOODCUTTING", "FLETCHING",
  "SLAYER", "FARMING", "CONSTRUCTION", "HUNTER", "SAILING",
];
/** The Wiki's "Runecraft"; the rest are the skill's own name. */
const LABELS = { RUNECRAFTING: "Runecraft" };

function skills() {
  const { Skill } = Common.getCore();
  return SKILLS.filter((key) => Skill[key]).map((key) => ({ key, skill: Skill[key] }));
}

const label = ({ key, skill }) => LABELS[key] ?? skill.getName();

function open(player) {
  const levels = player.getSkillManager();
  Common.menu(player, TITLE, [
    [CANCEL, () => {}],
    ...skills().map((entry) => [`${label(entry)} (${levels.getMaxLevel(entry.skill)})`, (chooser) => askLevel(chooser, entry)]),
  ]);
}

function askLevel(player, entry) {
  Common.askNumber(player, PROMPT, (level) => {
    if (setStat(player, entry, level)) open(player);
  });
}

/** Sets the skill's level and experience; false (with a message) for a level out of range. */
function setStat(player, { key, skill }, level) {
  const { Skill, SkillManager, WeaponInterfaceManager, Flag } = Common.getCore();
  const minimum = skill === Skill.HITPOINTS ? MIN_HITPOINTS : 1;
  if (!Number.isInteger(level) || level < minimum || level > MAX_LEVEL) {
    player.sendMessage(`${LABELS[key] ?? skill.getName()} can be set from ${minimum} to ${MAX_LEVEL}.`);
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

module.exports = { TITLE, CANCEL, MIN_HITPOINTS, open, setStat, skills };
