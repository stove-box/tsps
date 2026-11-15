# Boss helper tool

Item 3667, "A tool to teleport you to various bosses and setup slayer tasks."
(Wiki: [Boss helper tool](https://oldschool.runescape.wiki/w/Boss_helper_tool)). On live it's handed to everyone on
a beta world. Here, like the Rotten potato and the Holiday tool, only owners and developers can use it. Anyone else
gets "Nothing interesting happens."

Code: [`server/plugins/items/BossHelperTool.plugin.js`](../server/plugins/items/BossHelperTool.plugin.js), one unit
per tool in [`bosshelpertool/`](../server/plugins/items/bosshelpertool/). The destinations are
[`plugins/items/data/boss-helper-tool.json`](../server/plugins/items/data/boss-helper-tool.json). Tests:
`server/tests/boss-helper-tool.test.cjs` (`yarn build`, then `node --test tests/boss-helper-tool.test.cjs`).

## Debug

The cache's inventory option. It opens the scrolling chatbox menu (interface 187, the one the Wiki's Set Stats list
is keyed from), titled "Boss helper tool" (our title):

| Entry | From the Wiki's | What it does here |
| --- | --- | --- |
| Teleports | Desert Treasure II beta, 1 | The Boss list, below. |
| All Gear | Desert Treasure II beta, 2 | The supplies table, below. |
| Swap Spellbook | Desert Treasure II beta, 6, and 2024 betas, 4 | The occult altar's Venerate menu, from anywhere. The same spellbook unlocks apply as at the altar. |
| Set Stats | 2024 betas, 5 | "Set which skill?", below. |
| Unlock Everything | 2024 betas, 6 | Every quest, miniquest and diary, and the house, below. |

## Teleports: the Boss list

A grid of the Wiki's 46 destinations, in its order and spelling ("General Graador" included), each beside its
boss's icon: the boss's pet where it has one, otherwise one of its drops (Dharok's helm for Barrows, Bryophyta's
essence, the Hill giant club for Obor, an odium shard for the Chaos Fanatic, the Steel ring for the Deranged
archaeologist, the bottomless compost bucket for Hespori, a fire cape for the TzHaar challenges, a ring of dueling for
Ferox Enclave). It's the largest window the fixed-size viewport allows: four columns, 32 of the 46 at once and
the rest a short scroll away, with a search box over them. A click teleports there with the standard spell's teleport. The usual teleport
rules apply, so it works up to level 20 Wilderness, as the Wiki says.

On arrival the player has:

- **The entry items** (only those not already carried): ecumenical keys for the four God Wars generals (and a hammer
  for General Graardor's door), the frozen key for Nex, a knife for Sarachnis's webs, a dark totem for Skotizo, a
  mossy key for Bryophyta, a giant key for Obor, a spade for Barrows, boots of stone for the Alchemical Hydra, a
  brittle key for the Grotesque Guardians' roof, a facemask for the smoke devil dungeon, a fire cape for the
  Inferno and a Hespori seed for the Farming Guild's patch. The Wiki names only the ecumenical keys, the knife and
  the dark totem; the rest are ours, by the same rule.
- **The Slayer task**, from Duradel: a Boss task of 35 kills (the most a Boss task can be) for each of the 25
  bosses the cache's Boss task list has, and the TzTok-Jad and TzKal-Zuk tasks (1 kill) for those two. The other
  destinations leave the task alone. The amount is ours.
- **The quest its area is locked behind**, completed without its prerequisites (the Wiki's example: the Gauntlet
  completes Song of the Elves, not the rest of the Elf questline): Priest in Peril for Morytania (Barrows, the
  Nightmare and Phosani's Nightmare, the Theatre of Blood, the Grotesque Guardians), Song of the Elves for Prifddinas
  (both Gauntlets, Zalcano), Bone Voyage for Fossil Island, Regicide for Zulrah, Dragon Slayer II for Vorkath, Troll
  Stronghold for the God Wars Dungeon, and The Frozen Door as well for Nex. Only the stage and quest points are set:
  no rewards, experience, scroll or clan announcement.

Where each one lands is ours too (there's no capture of the beta): `teleports.json`'s tile where it has the
destination, otherwise the boss plugin's own entrance or lobby tile.

## All Gear: the supplies table

Near a bank (a booth, chest or banker within 8 tiles) it opens the cache's own supplies interface,
`tournament_supplies` (100). Elsewhere: "You need to be near a bank to use this feature".

The Items tab is the client's own: its script draws the 648 items of enum 1124. Take gives one; stackable items also
have Take-5, Take-10 and Take-X ("Enter amount:"). As many as fit are taken, and a full inventory gets "You don't
have enough inventory space." Examine gives the item's examine.

## Set Stats

"Set which skill?" lists "(Cancel)", then every skill with its level, in the Wiki's order (Sailing, newer than the
page, last). Choosing one asks "Enter a level:" (our text) and sets that level and its experience. Hitpoints can't
go below 10, and nothing goes above 99. Raising a skill shows an experience drop for what it gained. The menu then
opens again (ours), so the next skill can be set.

## Unlock Everything

All in one go, then "Unlocked: <n> quests, <n> diary tasks, and a furnished house in Rimmington." (our message):

- Every quest and miniquest is completed, the same quiet way as the teleports' quests.
- Every Achievement Diary task is done, with no per-task messages. The rewards are still claimed from the diary NPCs.
- The house becomes `::maxhouse`'s (one of every room, every space furnished) and moves to Rimmington. The player
  stays where they are, or is put outside the portal if they were inside. The portals, nexus, cape hanger and
  trophies are set up the first time they go in. `::restorehouse` brings the old house back.

## Events other plugins answer

| Event | Plugin | Does |
| --- | --- | --- |
| `slayer:assign-task` `{ player, boss \| task, amount }` | Slayer (`Dev.Slayer.js`) | Sets the task as `::slayertask` does; `assigned` is its name. |
| `quest:auto-complete` `{ player, key }`, `quest:auto-complete-all` `{ player }` | QuestCommand | Stage and quest points only. |
| `diary:complete-all` `{ player }` | AchievementDiaries | Every task, quietly. |
| `construction:max-house` `{ player, location }` | Construction (`MaxHouse.Construction.js`) | The max house, saved while the player stays put. |
| `altars:venerate-occult` `{ player }` | Altars | The Venerate menu. |
| `league:near-bank` | LeagueMode | Whether a bank is near (already there, used by the chugging barrel). |

## Not covered

- **The Load-outs tab** of the supplies table opens empty. The client draws it from inventory 207 and a list the
  server sends, and there's no capture of either.
- **The Corrupted Gauntlet** needs a completed Gauntlet first, which the teleport doesn't give.
- **The beta's own Boss list** was a chatbox menu. This one is a bigger grid with icons, as asked for.
- No capture of the tool exists, so every message here that the Wiki doesn't quote is ours.
