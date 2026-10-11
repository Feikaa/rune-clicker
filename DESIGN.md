# Rune Clicker: Design Document

Status: draft for review. All numbers are placeholders to be tuned. Nothing is built yet.

## 1. Overview

A browser clicker/idle game with light roguelike elements, built around the nine realms of Norse mythology.

You start in the humblest realm and climb to Asgard. You click to mine **Blank Runes**, imbue them into realms you have unlocked to make **realm runes**, and spend those on upgrades and on unlocking the next realm. Reaching Asgard triggers **Ragnarök**, a prestige reset that awards **Yggdrasil Seeds** for permanent progression. Each run after the first is shaped by a **fate**, **boons** and optional **curses**.

Pillars:
- **Minimal numbers, rich rune art.** The main screen is a big rune, a few numbers and a realm panel.
- **Each realm has its own job**, so where you imbue matters.
- **Slow idle start, strong idle late.** Clicking carries the early game; automation takes over around Helheim.
- **Every run differs** through fates, boons and curses, without needing combat.
- **Tone:** serious for realms, story and Ragnarök; humor in boon/curse names and flavor text.

## 2. Core loop

1. **Mine:** clicking produces Blank Runes.
2. **Imbue:** spend Blank Runes at an unlocked realm to get that realm's runes. Imbuing is instant.
3. **Spend:** realm runes buy upgrades and pay for the next realm.
4. **Unlock:** each realm costs runes from several earlier realms, so older realms stay relevant.
5. **Ragnarök:** reaching Asgard lets you reset for Seeds.

## 3. Realms

Order is fixed. Midgard is the starting realm; Svartalfheim is the first one unlocked.

| # | Realm | Theme | Job (what its runes do) |
|---|---|---|---|
| 1 | Midgard | Humans | Click power, cheap early upgrades. Pays for Svartalfheim. |
| 2 | Svartalfheim | Dwarves, smithing | Auto-miners (first idle). Unlocks the World Tree map. |
| 3 | Niflheim | Ice, mist | Storage: higher caps, small offline bonus. |
| 4 | Muspelheim | Fire | Imbuing efficiency and multipliers (the forge). |
| 5 | Jotunheim | Giants | Large flat production boosts. |
| 6 | Helheim | The dead | Souls: major automation efficiency and offline progress. |
| 7 | Alfheim | Light elves | Luck: crits, chance of double imbues. |
| 8 | Vanaheim | Vanir | Compounding growth: production that scales itself. |
| 9 | Asgard | Gods | Endgame upgrades; unlocking it enables Ragnarök. |

Rules of thumb for tuning:
- Later realms cost more Blank Runes per imbued rune, but their runes are worth more.
- Unlock costs mix several rune types (e.g. Jotunheim: Midgard + Muspelheim + Niflheim runes).
- Each realm has roughly 4 to 6 upgrades tied to its job.

## 4. Idle pacing

| Stage | Realms | Feel |
|---|---|---|
| Pure clicking | Midgard | All Blank Runes come from clicks. |
| First automation | Svartalfheim | Slow, inefficient miners. First time the game runs without you. |
| Refining | Niflheim, Muspelheim, Jotunheim | Boosts to clicking, imbuing and miners. Clicks still matter. |
| Idle takes over | Helheim | Big efficiency jump and offline progress. |
| Late game | Alfheim, Vanaheim, Asgard | Luck and compounding on top of strong automation. |

To keep the first minutes engaging: a small click-streak bonus and a discovery popup the first time each rune type is made.

## 5. Run structure and reveal schedule

| Run | What the player sees |
|---|---|
| 1 | Clicking, imbuing, realms, World Tree, **Odin's Blessing**, Ragnarök, Seeds. No fates, boons or curses. |
| 2 | Pick 1 of 3 **fates** at the start; pick 1 of 3 **boons** at each realm unlock. Blessing is gone. |
| 3+ | Everything above, plus whatever Seeds have unlocked (curses, rerolls, more fates and boons). |

The unlock flag is "has completed at least one Ragnarök" and is saved with the game state.

### Odin's Blessing (run 1)
- Realm unlocks and upgrades are cheaper, so run 1 is shorter.
- Shown in the UI as a banner/icon: "Odin's Blessing".
- Constant for the whole run, then ends. After the first Ragnarök the gods say "you're on your own now" and the real game begins.
- No speed bonus on Seeds in run 1 (see section 9).

## 6. The three layers of progression

| Layer | Resets at Ragnarök? | Bought with | Examples |
|---|---|---|---|
| Realm upgrades | Yes | Realm runes | Click power, miner speed, imbue ratios |
| Fate, boons, curses | Yes (re-rolled) | Chosen or rolled | "Fimbulwinter", "Dwarven Overtime", "Loki's Bargain" |
| Permanent tree | No | Yggdrasil Seeds | Bulk-imbue, auto-imbue, rerolls, curses, pool unlocks |

## 7. Fates, boons and curses

### Fates
- From run 2, each run starts with a **Pick 1 of 3** fates screen. Intro line along the lines of "The Norns weave three threads. Choose one."
- A fate is one modest twist for the whole run, readable in one line, shown as a small banner afterwards.
- Launch with about 8 to 10. Seeds unlock more.

Draft fates:
1. **Fimbulwinter:** Niflheim output x2, Muspelheim x0.5.
2. **Surt's Embers:** Muspelheim output x2, Niflheim x0.5.
3. **Dwarven Union:** Miners 50% stronger, click power 25% weaker.
4. **Giants' Appetite:** Jotunheim boosts doubled, unlock costs for Jotunheim +50%.
5. **Quiet Dead:** Helheim unlocks cheaper, Alfheim unlocks costlier.
6. **Golden Age:** Asgard costs reduced, but all other realms cost 10% more.
7. **Wanderer's Road:** Start with a free tier of one random boon.
8. **Heavy Hands:** Click power x2, auto-miners x0.6.
9. **Patient Roots:** Offline progress x2, active production x0.8.
10. **Idle Hands:** Auto-miners x2, click power x0.5.

### Boons
- Offered when a realm is unlocked: **pick 1 of 3** random boons from the pool for the run so far.
- Boons are themed to the realm just unlocked.
- **Stacking:** a repeat pick upgrades the boon in place, with 3 tiers (e.g. +20%, +30%, +40% runes from Alfheim). A max-tier boon leaves the pool.
- **Rerolls:** unlocked via Seeds. Start at 1 per run; more through further purchases.

Draft boons (name: tier 1 effect):
- **Svartalfheim:** Dwarven Overtime (miners 2x speed for 60s after each click); Deep Veins (miners +20% output); Tinkerer's Luck (chance of free miner).
- **Niflheim:** Frostbank (+25% storage cap); Cold Storage (offline progress +10%); Rime Rune (stored runes slowly grow).
- **Muspelheim:** Bellows (imbue cost -10%); Ember Surge (imbuing sometimes gives +1); Surtr's Favor (Muspelheim runes +20%).
- **Jotunheim:** Giant's Stride (+15% all production); Boulder Toss (click power +25%); Hoard (flat bonus per realm owned).
- **Helheim:** Soul Harvest (miners +20%); Hel's Patience (offline cap +25%); Deathless Toil (miner efficiency +15%).
- **Alfheim:** Light of the Elves (+20% runes from Alfheim); Glimmer (crit chance +5%); Twin Spark (double imbue chance +5%).
- **Vanaheim:** Fertile Soil (production grows 1% per minute); Harvest Rite (+10% per owned realm); Freyr's Gift (upgrades cost -10%).
- **Asgard:** Valhalla Feast (+25% all production); Odin's Eye (see next boon choices one step ahead); Thunder's Toll (click crits hit hard).

### Curses
- **Gated behind a Seed purchase.**
- A curse appears as one of the three boon options. It is stronger than a normal boon but carries a downside, so the risk is explicit and chosen.
- Some curses can **fail the run** (see below).
- A risky curse multiplies the Seed reward.

Draft curses:
- **Loki's Bargain:** +100% Muspelheim runes, but imbuing costs 25% more Blank Runes.
- **Nidhogg's Gnaw:** miners 3x faster, click power halved.
- **Fenrir's Chain** *(can fail)*: all production x2, but you must reach Asgard within a time limit or Ragnarök comes early.
- **Wolf at the Door** *(can fail)*: unlock costs halved, but a timer is running.
- **Hel's Debt:** Helheim boons stronger, but a share of production is paid as tribute.
- **Hubris:** huge Asgard bonus, all other realms 10% weaker.

### Failure
- Only through certain curses with a time limit.
- The timer is always visible and the limit is reachable.
- A failed run still pays out a reduced Seed amount; nothing is wasted.
- Failure is themed: "Fenrir broke free."

## 8. The World Tree

Unlocks at Svartalfheim as a new screen. Yggdrasil is shown with nine nodes: locked realms are dim silhouettes, unlocked realms glow in their own color. Tapping a realm opens its panel (rune, upgrades, imbue button).

Tree upgrades connect realms to each other, and come in two kinds:
- **Run-based:** bought with runes, reset by Ragnarök.
- **Permanent:** bought with Yggdrasil Seeds, kept forever.

### The Norns (permanent branches)
- **Urd (past):** bonuses based on total runes ever made.
- **Verdandi (present):** active-play bonuses (click power, streaks).
- **Skuld (future):** bonuses that pay off after Ragnarök (Seed gain, starting boosts).

### Example tree upgrades
- Synergies: "Roots of Fire and Ice" (Muspelheim and Niflheim runes boost each other); "Many Branches" (+X% all production per unlocked realm).
- Quality of life: bulk imbue; imbue all; **auto-imbue** with a chosen ratio (a permanent Seed upgrade, mid-game price); offline cap increases.
- Seed shop unlocks: **curses** (cheap and signposted, the first notable purchase), **rerolls**, new fates, new boons, extra boon tiers.
- Later flavor additions: Ratatoskr (faster imbue pacing), Nidhogg (risk/reward toggle), the eagle and hawk (luck).

## 9. Ragnarök and Seeds

Reaching Asgard makes Ragnarök available. It resets runes, upgrades, realm unlocks and the run's fate/boons. Seeds and permanent tree upgrades are kept.

### Seed reward
1. **Base:** flat amount for reaching Asgard.
2. **Runes earned:** bonus that scales with total runes made in the run, on a root/log curve.
3. **Speed bonus:** tiers based on absolute finish time (not personal best).

| Tier | Bonus |
|---|---|
| Slow | None |
| Steady | Small |
| Swift | Medium |
| Blitz | Large |

Thresholds are tuning values. The target time is shown on screen during the run.

Rules:
- **Clock:** active play time. Offline time counts at a reduced rate, so closing the tab overnight can't reach Blitz.
- **Run 1:** no speed bonus. The first payout should feel generous.
- **Curses:** time-limit curses stack with the speed bonus; risky curses multiply Seeds.
- **Choice screens:** the clock is paused while picking a fate or boon.
- **First Ragnarök** should award enough Seeds to afford at least one shop item, ideally curses or a first set of pool unlocks.
- **Failed curse runs** award a reduced amount.

## 10. Offline progress

Enabled. Capped, with the cap raised by Niflheim and Helheim upgrades and Seed purchases. Offline time counts toward the speed clock at a reduced rate.

## 11. Look and UI

- **Main screen:** big clickable rune, a few numbers, current realm panel. Minimal text.
- **Rune art:** SVG glyphs drawn in code, one per realm, recolorable.
- **World Tree map:** stylised Yggdrasil with 9 nodes, fades in when Svartalfheim is unlocked.
- **Choice screens:** three cards for fates, boons and curses.
- **Banners:** Odin's Blessing (run 1), active fate, active curse and timer if any.
- **Mobile:** layout designed mobile-first. The tree map and choice cards must work on a narrow touch screen.

## 12. Technical approach

- Plain HTML, CSS and JavaScript in the browser (TypeScript optional). No backend.
- Saves in localStorage, including the "completed first Ragnarök" flag, Seeds, tree purchases and unlocks.
- Hosted on GitHub Pages.
- **All balance numbers in one data file** (realms, costs, upgrades, boons, curses, fates, Seed tiers) so tuning doesn't touch code.
- Game state and rendering kept separate so the game loop can be tested without a browser.

## 13. Suggested build order

1. Core loop for Midgard + Svartalfheim: click, imbue, upgrades, auto-miners, save/load.
2. Remaining realms with their upgrades and unlock costs.
3. World Tree map and run-based tree upgrades.
4. Ragnarök, Seeds, permanent tree, offline progress, Odin's Blessing.
5. Fates and boons (run 2 reveal).
6. Curses, failure states, rerolls, Seed shop unlocks.
7. Art pass, mobile polish, balance pass.

## 14. Open items

- Final names for the rune currencies and glyph designs.
- All first-pass numbers: imbue ratios, unlock costs, miner efficiency, Seed values, speed tier thresholds, offline rate and cap.
- Exact boon/curse/fate lists and tier values.
- Whether the Blessing should fade gradually instead of ending abruptly (currently: constant, then ends).
- TypeScript vs plain JavaScript.
