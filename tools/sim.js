#!/usr/bin/env node
/*
 * Headless pacing simulation. A simple greedy bot plays runs and reports how
 * long each realm takes to unlock, so data.js can be tuned without clicking.
 *
 *   node tools/sim.js [runs=3] [clicksPerSecond=5]
 *   TRACE=1 node tools/sim.js 1   # stats at each unlock
 *   FATE=ymirs_hands node tools/sim.js 3   # force a fate from run 2
 */
'use strict';
require('../js/data.js');
const Game = require('../js/game.js');
const D = globalThis.RC.DATA;

const RUNS = Number(process.argv[2] || 3);
const CPS = Number(process.argv[3] || 5);
const DT = 0.1;
const SKIP = new Set(['n_frozen', 'n_winter', 'h_halls']); // offline-only, useless to an always-on bot

function blankEq(s, cost, st) {
  let t = 0;
  for (const r in cost) {
    const need = Math.max(0, cost[r] - s.run.runes[r]);
    t += need * Game.imbueCost(s, r, st) / Game.imbueYield(s, r, st);
  }
  return t;
}

function candidates(s, st) {
  const out = [];
  const next = Game.nextRealm(s);
  if (next) out.push({ kind: 'unlock', cost: Game.unlockCost(s, next, st), weight: 0.3 });
  for (const u of D.upgrades) {
    if (SKIP.has(u.id) || !Game.has(s.run, u.realm) || (s.run.upgrades[u.id] || 0) >= u.max) continue;
    // Only raise the cap when it is actually limiting.
    if (u.effects[0].stat === 'capMult' && s.run.blank < Game.cap(s, st) * 0.9) continue;
    out.push({ kind: 'up', id: u.id, cost: Game.upgradeCost(s, u.id, st), weight: 1 });
  }
  for (const u of D.treeUpgrades) {
    if (!Game.treeAvailable(s, u.id) || (s.run.tree[u.id] || 0) >= u.max) continue;
    out.push({ kind: 'tree', id: u.id, cost: Game.treeCost(s, u.id, st), weight: 1 });
  }
  return out;
}

function buyPerm(s) {
  // Spend seeds cheapest-first.
  for (;;) {
    const opts = D.permUpgrades.filter((u) => Game.permLevel(s.meta, u.id) < u.max && Game.permCost(s, u.id) <= s.meta.seeds);
    if (!opts.length) return;
    opts.sort((a, b) => Game.permCost(s, a.id) - Game.permCost(s, b.id));
    Game.buyPerm(s, opts[0].id);
  }
}

// TRACE=1 prints the main stats at each unlock.
function trace(s) {
  const st = Game.stats(s);
  const row = {
    rate: Game.productionRate(s, st), click: Game.clickValue(s, st), blank: s.run.blank, cap: Game.cap(s, st),
    globalMult: Game.globalMult(s, st), minerBase: st.minerBase, minerMult: st.minerMult, miners: Game.minerCount(s, st),
    imbueCost: st.imbueCostMult, yield: st.yieldMult, clickMult: st.clickMult,
  };
  console.log(s.run.unlocked[s.run.unlocked.length - 1], JSON.stringify(row, (k, v) => (typeof v === 'number' ? +v.toPrecision(3) : v)));
}

function playRun(s, label) {
  const splits = [];
  let clickAcc = 0, decideAcc = 0;
  const hardLimit = 4 * 3600;
  while (s.run.activeTime < hardLimit) {
    if (s.run.pending) {
      // FATE=<id> forces that fate whenever a fate is offered.
      if (process.env.FATE && s.run.pending.type === 'fate') s.run.pending.options[0] = process.env.FATE;
      Game.choose(s, 0);
      continue;
    }
    if (s.run.ended) break;
    clickAcc += CPS * DT;
    while (clickAcc >= 1) { Game.click(s); clickAcc--; }
    Game.tick(s, DT);
    decideAcc += DT;
    if (decideAcc < 0.5) continue;
    decideAcc = 0;

    if (Game.ragnarokReady(s)) break;
    if (Game.canUnlock(s)) {
      Game.unlockNext(s);
      splits.push([s.run.unlocked[s.run.unlocked.length - 1], s.run.activeTime]);
      if (process.env.TRACE) trace(s);
      continue;
    }
    const st = Game.stats(s);
    const cands = candidates(s, st);
    for (const c of cands) c.eq = blankEq(s, c.cost, st) * c.weight;
    cands.sort((a, b) => a.eq - b.eq);
    const target = cands[0];
    if (!target) continue;
    if (target.eq === 0) {
      if (target.kind === 'up') Game.buyUpgrade(s, target.id);
      else if (target.kind === 'tree') Game.buyTree(s, target.id);
      continue;
    }
    for (const r in target.cost) {
      const need = target.cost[r] - s.run.runes[r];
      if (need > 0) Game.imbue(s, r, Math.ceil(need / Game.imbueYield(s, r, st)));
    }
  }
  const fmt = (t) => `${Math.floor(t / 60)}m${String(Math.floor(t % 60)).padStart(2, '0')}s`;
  console.log(`\n== ${label}  (${CPS} cps)`);
  console.log(splits.map(([r, t]) => `  ${r.padEnd(13)} ${fmt(t)}`).join('\n'));
  const reward = s.run.ended || Game.ragnarokReady(s) ? Game.ragnarok(s) : null;
  if (reward) console.log(`  Ragnarök: ${reward.total} seeds (base ${reward.base}, runes ${reward.runes}, speed ${reward.tier ? reward.tier.name : '-'}${reward.failed ? ', FAILED' : ''})`);
  else console.log('  did not finish');
}

let seed = 42;
Game.rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const s = Game.newState();
for (let i = 1; i <= RUNS; i++) {
  playRun(s, `Run ${i}`);
  buyPerm(s);
  console.log(`  seeds left ${s.meta.seeds}, perm: ${JSON.stringify(s.meta.perm)}`);
}
