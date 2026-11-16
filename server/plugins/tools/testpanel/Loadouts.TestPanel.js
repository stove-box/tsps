// Gear loadouts for the test panel. Items are named by their generated ItemIdentifiers constant
// (from the cache), never by bare id; a name that doesn't resolve is reported, not guessed.
// `equip` is worn through the real equip path (so level and quest requirements still apply);
// `inventory` is added afterwards. `[NAME, amount]` sets a stack size.

const MELEE_SUPPLIES = [
  "DIVINE_SUPER_COMBAT_POTION_4_", "SUPER_COMBAT_POTION_4_",
  "SARADOMIN_BREW_4_", "SARADOMIN_BREW_4_", "SARADOMIN_BREW_4_", "SARADOMIN_BREW_4_",
  "SUPER_RESTORE_4_", "SUPER_RESTORE_4_", "SUPER_RESTORE_4_", "SUPER_RESTORE_4_",
  "ANGLERFISH", "ANGLERFISH", "ANGLERFISH", "ANGLERFISH", "ANGLERFISH", "ANGLERFISH",
  "COOKED_KARAMBWAN", "COOKED_KARAMBWAN", "STAMINA_POTION_4_", "ANTI_VENOM_4_",
];
const RANGED_SUPPLIES = [
  "RANGING_POTION_4_", "RANGING_POTION_4_",
  "SARADOMIN_BREW_4_", "SARADOMIN_BREW_4_", "SARADOMIN_BREW_4_", "SARADOMIN_BREW_4_",
  "SUPER_RESTORE_4_", "SUPER_RESTORE_4_", "SUPER_RESTORE_4_", "SUPER_RESTORE_4_",
  "ANGLERFISH", "ANGLERFISH", "ANGLERFISH", "ANGLERFISH", "ANGLERFISH", "ANGLERFISH",
  "COOKED_KARAMBWAN", "COOKED_KARAMBWAN", "STAMINA_POTION_4_", "ANTI_VENOM_4_",
];
const MAGIC_SUPPLIES = [
  "MAGIC_POTION_4_", "MAGIC_POTION_4_",
  "SARADOMIN_BREW_4_", "SARADOMIN_BREW_4_", "SARADOMIN_BREW_4_", "SARADOMIN_BREW_4_",
  "SUPER_RESTORE_4_", "SUPER_RESTORE_4_", "SUPER_RESTORE_4_", "SUPER_RESTORE_4_",
  "ANGLERFISH", "ANGLERFISH", "ANGLERFISH", "ANGLERFISH", "ANGLERFISH",
  "COOKED_KARAMBWAN", "STAMINA_POTION_4_", "ANTI_VENOM_4_",
];
const ANCIENT_RUNES = [["BLOOD_RUNE", 10000], ["DEATH_RUNE", 10000], ["WATER_RUNE", 20000], ["SOUL_RUNE", 5000]];
const PK_SUPPLIES = [
  "SUPER_COMBAT_POTION_4_", "RANGING_POTION_4_", "SARADOMIN_BREW_4_", "SARADOMIN_BREW_4_",
  "SUPER_RESTORE_4_", "SUPER_RESTORE_4_", "SHARK", "SHARK", "SHARK", "SHARK", "SHARK", "SHARK",
  "COOKED_KARAMBWAN", "COOKED_KARAMBWAN", "COOKED_KARAMBWAN",
];

const TORVA = ["TORVA_FULL_HELM", "TORVA_PLATEBODY", "TORVA_PLATELEGS"];
const MAX_MELEE_ACCESSORIES = ["AMULET_OF_RANCOUR", "INFERNAL_CAPE", "FEROCIOUS_GLOVES", "PRIMORDIAL_BOOTS", "ULTOR_RING", "RADAS_BLESSING_4"];
const MASORI = ["MASORI_MASK_F_", "MASORI_BODY_F_", "MASORI_CHAPS_F_"];
const ANCESTRAL = ["ANCESTRAL_HAT", "ANCESTRAL_ROBE_TOP", "ANCESTRAL_ROBE_BOTTOM"];
const GRACEFUL = ["GRACEFUL_HOOD", "GRACEFUL_TOP", "GRACEFUL_LEGS", "GRACEFUL_GLOVES", "GRACEFUL_BOOTS", "GRACEFUL_CAPE"];
const ELITE_VOID = ["ELITE_VOID_TOP", "ELITE_VOID_ROBE", "VOID_KNIGHT_GLOVES"];

const LOADOUTS = [
  // ---- Max gear ----
  { id: "max-melee-scythe", group: "Max gear", name: "Max melee — Scythe",
    equip: [...TORVA, ...MAX_MELEE_ACCESSORIES, "SCYTHE_OF_VITUR"],
    inventory: ["VOIDWAKER", "DRAGON_CLAWS", ...MELEE_SUPPLIES] },
  { id: "max-melee-fang", group: "Max gear", name: "Max melee — Fang + Avernic",
    equip: [...TORVA, ...MAX_MELEE_ACCESSORIES, "OSMUMTENS_FANG", "AVERNIC_DEFENDER"],
    inventory: ["VOIDWAKER", "DRAGON_CLAWS", ...MELEE_SUPPLIES] },
  { id: "max-melee-crush", group: "Max gear", name: "Max melee — Inquisitor's (crush)",
    equip: ["INQUISITORS_GREAT_HELM", "INQUISITORS_HAUBERK", "INQUISITORS_PLATESKIRT", ...MAX_MELEE_ACCESSORIES, "INQUISITORS_MACE", "AVERNIC_DEFENDER"],
    inventory: ["ELDER_MAUL", "DRAGON_WARHAMMER", ...MELEE_SUPPLIES] },
  { id: "max-ranged-tbow", group: "Max gear", name: "Max ranged — Twisted bow",
    equip: [...MASORI, "NECKLACE_OF_ANGUISH", "DIZANAS_QUIVER", "TWISTED_BOW", "ZARYTE_VAMBRACES", "PEGASIAN_BOOTS", "VENATOR_RING", ["DRAGON_ARROW", 5000]],
    inventory: ["ZARYTE_CROSSBOW", ["RUBY_DRAGON_BOLTS_E_", 1000], ["DIAMOND_DRAGON_BOLTS_E_", 1000], ...RANGED_SUPPLIES] },
  { id: "max-ranged-bowfa", group: "Max gear", name: "Max ranged — Bow of faerdhinen",
    equip: ["CRYSTAL_HELM", "CRYSTAL_BODY", "CRYSTAL_LEGS", "NECKLACE_OF_ANGUISH", "DIZANAS_QUIVER", "BOW_OF_FAERDHINEN_C_", "ZARYTE_VAMBRACES", "PEGASIAN_BOOTS", "VENATOR_RING"],
    inventory: ["ZARYTE_CROSSBOW", ["RUBY_DRAGON_BOLTS_E_", 1000], ...RANGED_SUPPLIES] },
  { id: "max-magic-shadow", group: "Max gear", name: "Max magic — Tumeken's shadow",
    equip: [...ANCESTRAL, "OCCULT_NECKLACE", "IMBUED_GUTHIX_CAPE", "TUMEKENS_SHADOW", "CONFLICTION_GAUNTLETS", "ETERNAL_BOOTS", "MAGUS_RING"],
    inventory: [...MAGIC_SUPPLIES] },
  { id: "max-magic-sang", group: "Max gear", name: "Max magic — Sanguinesti + Ward",
    equip: [...ANCESTRAL, "OCCULT_NECKLACE", "IMBUED_GUTHIX_CAPE", "SANGUINESTI_STAFF", "ELIDINIS_WARD_F_", "TORMENTED_BRACELET", "ETERNAL_BOOTS", "MAGUS_RING"],
    inventory: [...MAGIC_SUPPLIES] },
  { id: "max-magic-kodai", group: "Max gear", name: "Max magic — Kodai (Ancients)",
    equip: [...ANCESTRAL, "OCCULT_NECKLACE", "IMBUED_GUTHIX_CAPE", "KODAI_WAND", "ELIDINIS_WARD_F_", "TORMENTED_BRACELET", "ETERNAL_BOOTS", "MAGUS_RING"],
    inventory: [...ANCIENT_RUNES, ...MAGIC_SUPPLIES] },

  // ---- High / mid tier ----
  { id: "bandos-tentacle", group: "High & mid tier", name: "Bandos + Tentacle",
    equip: ["NEITIZNOT_FACEGUARD", "BANDOS_CHESTPLATE", "BANDOS_TASSETS", "AMULET_OF_TORTURE", "FIRE_CAPE", "ABYSSAL_TENTACLE", "DRAGON_DEFENDER", "BARROWS_GLOVES", "PRIMORDIAL_BOOTS", "BERSERKER_RING_I_"],
    inventory: ["BANDOS_GODSWORD", "DRAGON_WARHAMMER", ...MELEE_SUPPLIES] },
  { id: "armadyl-acb", group: "High & mid tier", name: "Armadyl + Armadyl crossbow",
    equip: ["ARMADYL_HELMET", "ARMADYL_CHESTPLATE", "ARMADYL_CHAINSKIRT", "NECKLACE_OF_ANGUISH", "AVAS_ASSEMBLER", "ARMADYL_CROSSBOW", "TWISTED_BUCKLER", "BARROWS_GLOVES", "PEGASIAN_BOOTS", "ARCHERS_RING_I_", ["RUBY_DRAGON_BOLTS_E_", 2000]],
    inventory: [["DIAMOND_DRAGON_BOLTS_E_", 1000], ...RANGED_SUPPLIES] },
  { id: "ahrims", group: "High & mid tier", name: "Ahrim's",
    equip: ["AHRIMS_HOOD", "AHRIMS_ROBETOP", "AHRIMS_ROBESKIRT", "OCCULT_NECKLACE", "IMBUED_SARADOMIN_CAPE", "AHRIMS_STAFF", "BARROWS_GLOVES", "ETERNAL_BOOTS", "SEERS_RING_I_"],
    inventory: [...ANCIENT_RUNES, ...MAGIC_SUPPLIES] },
  { id: "infinity", group: "High & mid tier", name: "Infinity + Master wand",
    equip: ["INFINITY_HAT", "INFINITY_TOP", "INFINITY_BOTTOMS", "AMULET_OF_FURY", "IMBUED_SARADOMIN_CAPE", "MASTER_WAND", "ARCANE_SPIRIT_SHIELD", "INFINITY_GLOVES", "INFINITY_BOOTS", "SEERS_RING_I_"],
    inventory: [...ANCIENT_RUNES, ...MAGIC_SUPPLIES] },
  { id: "dharoks", group: "High & mid tier", name: "Dharok's",
    equip: ["DHAROKS_HELM", "DHAROKS_PLATEBODY", "DHAROKS_PLATELEGS", "AMULET_OF_TORTURE", "FIRE_CAPE", "DHAROKS_GREATAXE", "BARROWS_GLOVES", "DRAGON_BOOTS", "BERSERKER_RING_I_"],
    inventory: [...MELEE_SUPPLIES] },
  { id: "elite-void-melee", group: "High & mid tier", name: "Elite void — melee",
    equip: [...ELITE_VOID, "VOID_MELEE_HELM", "AMULET_OF_TORTURE", "FIRE_CAPE", "ABYSSAL_TENTACLE", "DRAGON_DEFENDER", "PRIMORDIAL_BOOTS", "BERSERKER_RING_I_"],
    inventory: [...MELEE_SUPPLIES] },
  { id: "elite-void-ranged", group: "High & mid tier", name: "Elite void — ranged",
    equip: [...ELITE_VOID, "VOID_RANGER_HELM", "NECKLACE_OF_ANGUISH", "AVAS_ASSEMBLER", "ARMADYL_CROSSBOW", "TWISTED_BUCKLER", "PEGASIAN_BOOTS", "ARCHERS_RING_I_", ["RUBY_DRAGON_BOLTS_E_", 2000]],
    inventory: [...RANGED_SUPPLIES] },
  { id: "elite-void-magic", group: "High & mid tier", name: "Elite void — magic",
    equip: [...ELITE_VOID, "VOID_MAGE_HELM", "OCCULT_NECKLACE", "IMBUED_GUTHIX_CAPE", "KODAI_WAND", "ARCANE_SPIRIT_SHIELD", "ETERNAL_BOOTS", "SEERS_RING_I_"],
    inventory: [...ANCIENT_RUNES, ...MAGIC_SUPPLIES] },
  { id: "mid-melee", group: "High & mid tier", name: "Fighter torso + Whip",
    equip: ["HELM_OF_NEITIZNOT", "FIGHTER_TORSO", "DRAGON_PLATELEGS", "AMULET_OF_GLORY_6_", "FIRE_CAPE", "ABYSSAL_WHIP", "DRAGON_DEFENDER", "BARROWS_GLOVES", "DRAGON_BOOTS", "BERSERKER_RING_I_"],
    inventory: ["DRAGON_DAGGER_P_PLUS_PLUS_", ...MELEE_SUPPLIES] },
  { id: "obsidian", group: "High & mid tier", name: "Obsidian",
    equip: ["OBSIDIAN_HELMET", "OBSIDIAN_PLATEBODY", "OBSIDIAN_PLATELEGS", "BERSERKER_NECKLACE", "FIRE_CAPE", "TOKTZ_XIL_AK", "TOKTZ_KET_XIL", "BARROWS_GLOVES", "DRAGON_BOOTS", "BERSERKER_RING_I_"],
    inventory: ["TZHAAR_KET_OM", ...MELEE_SUPPLIES] },
  { id: "dhide-msb", group: "High & mid tier", name: "Black d'hide + Magic shortbow",
    equip: ["COIF", "BLACK_DHIDE_BODY", "BLACK_DHIDE_CHAPS", "AMULET_OF_GLORY_6_", "AVAS_ACCUMULATOR", "MAGIC_SHORTBOW", "BLACK_DHIDE_VAMBRACES", "SNAKESKIN_BOOTS", "ARCHERS_RING_I_", ["AMETHYST_ARROW", 2000]],
    inventory: [...RANGED_SUPPLIES] },
  { id: "mystic", group: "High & mid tier", name: "Mystic + Ancient staff",
    equip: ["MYSTIC_HAT", "MYSTIC_ROBE_TOP", "MYSTIC_ROBE_BOTTOM", "AMULET_OF_GLORY_6_", "IMBUED_SARADOMIN_CAPE", "ANCIENT_STAFF", "MAGES_BOOK", "MYSTIC_GLOVES", "MYSTIC_BOOTS", "SEERS_RING_I_"],
    inventory: [...ANCIENT_RUNES, ...MAGIC_SUPPLIES] },
  { id: "rune", group: "High & mid tier", name: "Rune armour (budget)",
    equip: ["RUNE_FULL_HELM", "RUNE_PLATEBODY", "RUNE_PLATELEGS", "AMULET_OF_POWER", "RUNE_SCIMITAR", "RUNE_KITESHIELD", "LEATHER_GLOVES", "CLIMBING_BOOTS", "RING_OF_RECOIL"],
    inventory: ["SHARK", "SHARK", "SHARK", "SHARK", "SHARK", "SHARK", "SHARK", "SHARK", "SUPER_COMBAT_POTION_4_"] },

  // ---- PvP ----
  { id: "pvp-max-hybrid", group: "PvP", name: "Max hybrid (Ancestral, switches)",
    equip: [...ANCESTRAL, "OCCULT_NECKLACE", "IMBUED_GUTHIX_CAPE", "KODAI_WAND", "ELYSIAN_SPIRIT_SHIELD", "BARROWS_GLOVES", "ETERNAL_BOOTS", "RING_OF_SUFFERING_I_"],
    inventory: ["TORVA_PLATEBODY", "TORVA_PLATELEGS", "AMULET_OF_TORTURE", "VOIDWAKER", "AVERNIC_DEFENDER", "ARMADYL_CROSSBOW", ["DIAMOND_DRAGON_BOLTS_E_", 500], ...ANCIENT_RUNES, ...PK_SUPPLIES.slice(0, 13)] },
  { id: "pvp-zerker", group: "PvP", name: "Zerker",
    equip: ["HELM_OF_NEITIZNOT", "BLACK_DHIDE_BODY", "RUNE_PLATELEGS", "AMULET_OF_FURY", "FIRE_CAPE", "DRAGON_SCIMITAR", "DRAGON_DEFENDER", "BARROWS_GLOVES", "CLIMBING_BOOTS", "BERSERKER_RING_I_"],
    inventory: ["ARMADYL_GODSWORD", "GRANITE_MAUL", "DRAGON_DAGGER_P_PLUS_PLUS_", ...PK_SUPPLIES] },
  { id: "pvp-pure", group: "PvP", name: "Pure",
    equip: ["COIF", "ZAMORAK_MONK_TOP", "BLACK_DHIDE_CHAPS", "AMULET_OF_STRENGTH", "BLACK_CAPE", "DRAGON_SCIMITAR", "LEATHER_GLOVES", "CLIMBING_BOOTS", "RING_OF_RECOIL"],
    inventory: ["DRAGON_DAGGER_P_PLUS_PLUS_", "GRANITE_MAUL", "MAGIC_SHORTBOW", ["AMETHYST_ARROW", 500], ...PK_SUPPLIES] },
  { id: "pvp-wildy-weapons", group: "PvP", name: "Wilderness weapons (Virtus + switches)",
    equip: ["VIRTUS_MASK", "VIRTUS_ROBE_TOP", "VIRTUS_ROBE_BOTTOM", "OCCULT_NECKLACE", "IMBUED_GUTHIX_CAPE", "ACCURSED_SCEPTRE", "ELYSIAN_SPIRIT_SHIELD", "BARROWS_GLOVES", "ETERNAL_BOOTS", "RING_OF_SUFFERING_I_"],
    inventory: ["HEAVY_BALLISTA", ["DRAGON_JAVELIN", 500], "VOIDWAKER", ...PK_SUPPLIES] },

  // ---- Skilling ----
  { id: "graceful-tools", group: "Skilling", name: "Graceful + dragon tools",
    equip: GRACEFUL,
    inventory: ["DRAGON_PICKAXE", "DRAGON_AXE", "DRAGON_HARPOON", "STAMINA_POTION_4_", "STAMINA_POTION_4_"] },
  { id: "graceful-infernal", group: "Skilling", name: "Graceful + infernal / crystal tools",
    equip: GRACEFUL,
    inventory: ["INFERNAL_PICKAXE", "INFERNAL_AXE", "CRYSTAL_PICKAXE", "CRYSTAL_AXE", "STAMINA_POTION_4_", "STAMINA_POTION_4_"] },
  { id: "max-cape", group: "Skilling", name: "Max cape + Graceful",
    equip: ["MAX_HOOD", "GRACEFUL_TOP", "GRACEFUL_LEGS", "GRACEFUL_GLOVES", "GRACEFUL_BOOTS", "MAX_CAPE_3"],
    inventory: ["STAMINA_POTION_4_", "STAMINA_POTION_4_"] },

  // ---- Inventory only (keeps what is worn) ----
  { id: "supplies-melee", group: "Supplies only", name: "Melee supplies", keepWorn: true, equip: [], inventory: MELEE_SUPPLIES },
  { id: "supplies-ranged", group: "Supplies only", name: "Ranged supplies", keepWorn: true, equip: [], inventory: RANGED_SUPPLIES },
  { id: "supplies-magic", group: "Supplies only", name: "Magic supplies + Ancient runes", keepWorn: true, equip: [], inventory: [...ANCIENT_RUNES, ...MAGIC_SUPPLIES] },
  { id: "supplies-specs", group: "Supplies only", name: "Special attack weapons", keepWorn: true, equip: [],
    inventory: ["DRAGON_CLAWS", "BURNING_CLAWS", "VOIDWAKER", "ARMADYL_GODSWORD", "BANDOS_GODSWORD", "DRAGON_WARHAMMER", "ELDER_MAUL", "GRANITE_MAUL", "DRAGON_DAGGER_P_PLUS_PLUS_", "SOULREAPER_AXE", "HEAVY_BALLISTA", "ZARYTE_CROSSBOW", "TOXIC_BLOWPIPE", "STAFF_OF_THE_DEAD", "NOXIOUS_HALBERD", "CRYSTAL_HALBERD"] },
];

/** Every loadout with its items resolved to ids; `missing` lists names ItemIdentifiers lacks. */
function resolveLoadouts(core) {
  const ids = core.ItemIdentifiers ?? {};
  const resolve = (entry) => {
    const [constant, amount] = Array.isArray(entry) ? entry : [entry, 1];
    const id = ids[constant];
    const definition = Number.isInteger(id) ? core.ItemDefinition.forId?.(id) : null;
    return { constant, id: Number.isInteger(id) ? id : null, amount, name: definition?.getName?.() ?? constant };
  };
  return LOADOUTS.map((loadout) => {
    const equip = loadout.equip.map(resolve);
    const inventory = loadout.inventory.map(resolve);
    return {
      id: loadout.id,
      group: loadout.group,
      name: loadout.name,
      keepWorn: loadout.keepWorn === true,
      equip,
      inventory,
      missing: [...equip, ...inventory].filter((item) => item.id === null).map((item) => item.constant),
    };
  });
}

module.exports = { resolveLoadouts };
