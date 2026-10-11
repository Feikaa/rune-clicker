# Rune Clicker

A browser clicker/idle game with light roguelike elements, set across the nine realms of Norse mythology. See [DESIGN.md](DESIGN.md) for the full game design.

Mine Blank Runes, imbue them into the realms you have unlocked, spend realm runes on upgrades and on the next realm, and climb from Midgard to Asgard. Reaching Asgard lets you call **Ragnarök** for Yggdrasil Seeds, which buy permanent upgrades. From the second run on, each run gets a **fate**, every realm unlock offers a **boon**, and (once bought with Seeds) **curses** can appear.

## Play

No build step. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

It is a static site, so GitHub Pages can host it straight from the repository root.

Progress saves to `localStorage` every 10 seconds and when the tab is hidden. Export/import and a full reset are in the ⚙ tab. Space bar mines too.

## Project layout

| Path | What it is |
|---|---|
| `index.html` | Page shell |
| `css/style.css` | All styling (mobile-first, two columns from 900px) |
| `js/data.js` | **Every balance number**: realms, costs, upgrades, World Tree, Seed shop, fates, boons, curses, Seed tiers |
| `js/game.js` | Game logic on a plain state object. No DOM, so it runs in Node |
| `js/glyphs.js` | Rune glyphs drawn as SVG strokes (Elder Futhark, one per realm) |
| `js/ui.js` | Rendering: panels rebuild only on structural change; numbers refresh every frame |
| `js/main.js` | Main loop, input, save/load, offline progress, modal flow |
| `tests/` | Unit tests for the game logic (`npm test`, Node 18+) |
| `tools/sim.js` | Headless pacing simulation: a greedy bot plays runs and prints unlock times (`npm run sim`) |
| `tools/retune.py` | Small helper used while balancing to rewrite upgrade numbers in `data.js` |

## Tuning

All numbers live in `js/data.js`. After changing them, run `npm run sim` to see how long each realm takes. With the current numbers, an efficient bot clicking 4 times a second finishes run 1 in about 19 minutes, and later runs get faster as Seeds are spent. Human players will be slower than the bot.

Effects are declared as data, for example `{ stat: 'minerMult', op: 'mul', v: 1.4 }`. `add` effects scale linearly with level and `mul` effects compound. Stats are listed in `baseStats`. Per-realm keys such as `yield_niflheim`, `unlockCost_asgard`, `upgradeScale_jotunheim` and `boonScale_helheim` are also supported.

## Decisions on the GDD's open items

- **Language:** plain JavaScript, no build.
- **Odin's Blessing:** stays constant for the whole of run 1, then ends (unlocks and upgrades cost 40% less).
- **Bulk imbue:** ×1 and ×10 from the start. ×100 and Max come from *Ratatoskr's Errands*, a cheap run-based World Tree upgrade. Auto-imbue (weighted per realm) is a Seed purchase.
- **Odin's Eye** (Asgard boon) grants extra rerolls instead of previewing the next boon choice.
- **Curses** have a single tier and leave the pool once taken. The timed curses (*Fenrir's Chain*, *Wolf at the Door*) start their timer when picked.
- **Offline time** counts at 25% toward the run clock, so leaving the tab overnight can't reach Blitz.
- **Speed tiers** (run 2+): Blitz ≤ 12 min, Swift ≤ 18 min, Steady ≤ 30 min, otherwise Slow.
