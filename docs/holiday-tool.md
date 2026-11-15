# Holiday tool

Item 11996, "Spawns an allowance of holiday items each day." On live it belongs to Jagex
moderators; here only owners and developers can use it. Anyone else who clicks it gets
"Nothing interesting happens."

Code: [`server/plugins/items/HolidayTool.plugin.js`](../server/plugins/items/HolidayTool.plugin.js),
with tile finding in [`holidaytool/Spawns.HolidayTool.js`](../server/plugins/items/holidaytool/Spawns.HolidayTool.js).
Tests: `server/tests/holiday-tool.test.cjs` (`yarn build`, then `node --test tests/holiday-tool.test.cjs`).

## Spawn Item

The cache's own inventory option. It opens a chatbox menu, "Choose a holiday to spawn items:":

| Option | Items |
| --- | --- |
| Easter | Easter egg |
| Halloween | Red, blue and green halloween masks, pumpkin |
| Christmas | Christmas cracker, Santa hat, red, yellow, blue, green, purple and white partyhats |

Choosing one opens the "Enter amount" prompt, "How many items would you like to spawn?". That
many items drop, at most 50 (a larger amount is cut to 50; less than 1 drops nothing), each
one picked at random from that holiday's list. All are the tradeable originals. They are seen
by everyone, don't come back once taken, and the player is told "You spawn <n> <holiday> items."

## Where the items land

On a random tile up to 10 tiles each way from the player (a 21 by 21 square), and only where
the player could pick them up:

- **Open floor they can walk to.** A walk out from the player's tile, one collision-checked
  step at a time, finds it. Trees, rocks, water, walls and anything fenced off are never
  reached. A tile counts as open floor when nothing stands on it but wall edges and ground
  decoration (flowers, rubble).
- **Tables they can reach**: scenery named "table" with a reached tile beside it.

Never on the player's own tile. Each item gets a tile of its own until every spawn tile holds
one, and only then do they share. A player with nowhere reachable around them gets the items on
their own tile.

The Rotten potato's Spawn RARE! finds its tiles the same way, within 5 tiles.
