// Run with: node --test tests/*.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/data.js');
const Game = require('../js/game.js');
const D = globalThis.RC.DATA;

function seeded(seed = 1) {
  return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
}

function fresh() {
  Game.rng = seeded();
  return Game.newState();
}

// Give the run enough of every rune to afford anything.
function rich(s) {
  D.realmOrder.forEach((r) => { s.run.runes[r] = 1e15; });
}

test('new game starts in Midgard with Odin\'s Blessing and no fate', () => {
  const s = fresh();
  assert.deepEqual(s.run.unlocked, ['midgard']);
  assert.equal(s.run.blessing, true);
  assert.equal(s.run.pending, null);
  assert.equal(s.run.blank, 0);
});

test('clicking mines Blank Runes, respects the cap and builds a streak', () => {
  const s = fresh();
  const r = Game.click(s);
  assert.ok(r.gained > 0);
  assert.equal(s.run.blank, r.gained);
  Game.click(s);
  assert.equal(s.run.streak, 2);
  s.run.blank = Game.cap(s) - 0.5;
  Game.click(s);
  assert.equal(s.run.blank, Game.cap(s));
});

test('streak decays after a pause', () => {
  const s = fresh();
  Game.click(s); Game.click(s);
  Game.tick(s, D.streak.decay + 0.1);
  assert.equal(s.run.streak, 0);
});

test('imbuing converts Blank Runes into realm runes', () => {
  const s = fresh();
  s.run.blank = 100;
  const got = Game.imbue(s, 'midgard', 3);
  assert.equal(got, 3);
  assert.equal(s.run.blank, 70);
  assert.equal(s.run.runes.midgard, 3);
  assert.equal(Game.imbue(s, 'midgard', 'max'), 7);
  assert.equal(s.run.blank, 0);
  // Cannot imbue into a locked realm.
  s.run.blank = 1000;
  assert.equal(Game.imbue(s, 'niflheim', 1), 0);
});

test('upgrades cost runes, raise level and stop at max', () => {
  const s = fresh();
  s.run.runes.midgard = 1000;
  const before = Game.clickValue(s);
  assert.ok(Game.buyUpgrade(s, 'm_chisel'));
  assert.equal(s.run.upgrades.m_chisel, 1);
  assert.ok(Game.clickValue(s) > before);
  rich(s);
  while (Game.buyUpgrade(s, 'm_tales'));
  assert.equal(s.run.upgrades.m_tales, Game.lookup().upgrades.m_tales.max);
});

test('blessing makes unlocks cheaper; unlocks pay costs and advance realms', () => {
  const s = fresh();
  const blessed = Game.unlockCost(s, 'svartalfheim').midgard;
  s.run.blessing = false;
  const normal = Game.unlockCost(s, 'svartalfheim').midgard;
  assert.ok(blessed < normal);
  s.run.blessing = true;
  assert.equal(Game.unlockNext(s), false);
  s.run.runes.midgard = blessed;
  assert.equal(Game.unlockNext(s), true);
  assert.deepEqual(s.run.unlocked, ['midgard', 'svartalfheim']);
  assert.equal(s.run.runes.midgard, 0);
});

test('miners produce Blank Runes over time', () => {
  const s = fresh();
  rich(s);
  Game.unlockNext(s);
  for (let i = 0; i < 5; i++) Game.buyUpgrade(s, 's_miner');
  const rate = Game.productionRate(s);
  assert.ok(rate > 0);
  Game.tick(s, 10);
  assert.ok(Math.abs(s.run.blank - rate * 10) < 1e-6);
});

test('first run has no choices; Ragnarök awards seeds and starts run 2 with a fate pick', () => {
  const s = fresh();
  rich(s);
  while (Game.unlockNext(s));
  assert.equal(s.run.unlocked.length, 9);
  assert.equal(s.run.pending, null, 'no boons in run 1');
  assert.ok(Game.ragnarokReady(s));
  s.run.runBlank = 1e12;
  const r = Game.ragnarok(s);
  assert.equal(r.first, true);
  assert.equal(r.tier, null, 'no speed bonus in run 1');
  assert.ok(r.total >= Game.lookup().perm.shop_curses.base, 'first payout affords the curse unlock');
  assert.equal(s.meta.ragnaroks, 1);
  assert.equal(s.meta.seeds, r.total);
  assert.equal(s.run.blessing, false);
  assert.equal(s.run.pending.type, 'fate');
  assert.equal(s.run.pending.options.length, 3);
  // Base pool only: no pack fates until bought.
  s.run.pending.options.forEach((id) => assert.ok(!Game.lookup().fates[id].pack));
});

test('choice screens freeze the game clock', () => {
  const s = fresh();
  s.meta.ragnaroks = 1;
  s.run = Game.newState().run; // new state ignores meta, so build run 2 manually
  s.run.pending = { type: 'fate', options: ['fimbulwinter', 'surts_embers', 'quiet_dead'] };
  Game.tick(s, 30);
  assert.equal(s.run.activeTime, 0);
  assert.equal(Game.click(s), null);
  Game.choose(s, 0);
  assert.equal(s.run.fate, 'fimbulwinter');
  Game.tick(s, 30);
  assert.equal(s.run.activeTime, 30);
});

test('fates change stats', () => {
  const s = fresh();
  s.run.fate = 'fimbulwinter';
  const st = Game.stats(s);
  assert.equal(Game.imbueYield(s, 'niflheim', st), 2);
  assert.equal(Game.imbueYield(s, 'muspelheim', st), 0.5);
});

test('realm unlocks offer boons from run 2; repeat picks stack tiers up to the max', () => {
  const s = fresh();
  s.meta.ragnaroks = 1;
  rich(s);
  Game.unlockNext(s);
  const p = s.run.pending;
  assert.equal(p.type, 'boon');
  assert.equal(p.realm, 'svartalfheim');
  assert.equal(p.options.length, 3);
  p.options.forEach((o) => assert.equal(Game.lookup().boons[o.id].realm, 'svartalfheim'));
  const id = p.options[0].id;
  Game.choose(s, 0);
  assert.equal(s.run.boons[id], 1);
  for (let i = 0; i < 5; i++) { s.run.pending = { type: 'boon', realm: 'svartalfheim', options: [{ kind: 'boon', id }] }; Game.choose(s, 0); }
  assert.equal(s.run.boons[id], D.boonTiers);
});

test('curses only appear once unlocked with Seeds', () => {
  const s = fresh();
  s.meta.ragnaroks = 1;
  for (let i = 0; i < 40; i++) {
    s.run = Object.assign(s.run, { unlocked: ['midgard'], pending: null });
    rich(s);
    Game.unlockNext(s);
    assert.ok(s.run.pending.options.every((o) => o.kind === 'boon'));
  }
  s.meta.perm.shop_curses = 1;
  let sawCurse = false;
  for (let i = 0; i < 40; i++) {
    s.run = Object.assign(s.run, { unlocked: ['midgard'], pending: null });
    Game.unlockNext(s);
    if (s.run.pending.options.some((o) => o.kind === 'curse')) sawCurse = true;
  }
  assert.ok(sawCurse);
});

test('a timed curse fails the run and pays reduced seeds', () => {
  const s = fresh();
  s.meta.ragnaroks = 1;
  s.run.pending = { type: 'boon', realm: 'svartalfheim', options: [{ kind: 'curse', id: 'fenrirs_chain' }] };
  Game.choose(s, 0);
  assert.ok(s.run.timer);
  const normal = Game.seedReward(s).total;
  Game.tick(s, Game.lookup().curses.fenrirs_chain.timer + 1);
  assert.ok(s.run.ended && s.run.ended.failed);
  const failedReward = Game.seedReward(s, true);
  assert.ok(failedReward.total <= normal);
  const r = Game.ragnarok(s);
  assert.equal(r.failed, true);
  assert.equal(s.meta.history[0].failed, true);
});

test('reaching Asgard clears a curse timer', () => {
  const s = fresh();
  s.meta.ragnaroks = 1;
  s.run.pending = { type: 'boon', realm: 'svartalfheim', options: [{ kind: 'curse', id: 'wolf_at_door' }] };
  Game.choose(s, 0);
  rich(s);
  while (Game.unlockNext(s)) s.run.pending = null;
  assert.equal(s.run.timer, null);
});

test('speed tiers apply from run 2', () => {
  const s = fresh();
  s.meta.ragnaroks = 1;
  s.run.activeTime = 60;
  assert.equal(Game.speedTier(s).id, 'blitz');
  s.run.activeTime = 1e6;
  assert.equal(Game.speedTier(s).id, 'slow');
});

test('permanent upgrades cost Seeds and persist through Ragnarök', () => {
  const s = fresh();
  s.meta.seeds = 100;
  assert.ok(Game.buyPerm(s, 'sk_head'));
  assert.ok(Game.buyPerm(s, 'urd_cache'));
  rich(s);
  while (Game.unlockNext(s));
  Game.ragnarok(s);
  assert.equal(s.meta.perm.sk_head, 1);
  assert.equal(s.run.bonusMiners, 3);
  assert.equal(s.run.blank, 150);
});

test('auto-imbue spends Blank Runes by weight', () => {
  const s = fresh();
  s.meta.perm.shop_auto = 1;
  s.run.blank = 200;
  s.run.autoWeights.midgard = 1;
  Game.tick(s, 1);
  assert.ok(s.run.runes.midgard > 0);
  assert.ok(s.run.blank < 200);
});

test('offline progress is capped and runs the clock at a reduced rate', () => {
  const s = fresh();
  rich(s);
  Game.unlockNext(s);
  for (let i = 0; i < 10; i++) Game.buyUpgrade(s, 's_miner');
  s.run.blank = 0;
  const st = Game.stats(s);
  const sum = Game.applyOffline(s, 100 * 3600);
  assert.equal(sum.capped, true);
  assert.equal(sum.used, st.offlineCapH * 3600);
  assert.ok(Math.abs(s.run.activeTime - sum.used * D.offline.clockRate) < 1e-6);
  assert.ok(sum.mined > 0);
});

test('save round-trips through JSON', () => {
  const s = fresh();
  s.run.runes.midgard = 42;
  s.meta.seeds = 7;
  s.meta.perm.ver_click = 2;
  const t = Game.deserialize(Game.serialize(s));
  assert.equal(t.run.runes.midgard, 42);
  assert.equal(t.meta.seeds, 7);
  assert.equal(t.meta.perm.ver_click, 2);
  assert.deepEqual(t.events, []);
});

test('every data reference points at something real', () => {
  const realms = new Set(D.realmOrder);
  D.upgrades.forEach((u) => assert.ok(realms.has(u.realm), u.id));
  D.treeUpgrades.forEach((u) => { Object.keys(u.cost).forEach((r) => assert.ok(realms.has(r), u.id)); u.requires.forEach((r) => assert.ok(realms.has(r), u.id)); });
  D.boons.forEach((b) => { assert.ok(b.realm === 'any' || realms.has(b.realm), b.id); b.effects.forEach((e) => assert.ok(e.t.length >= D.boonTiers + 1, b.id)); });
  D.realmOrder.forEach((r, i) => {
    const u = D.realms[r].unlock;
    if (i === 0) return;
    Object.keys(u).forEach((c) => assert.ok(D.realmOrder.indexOf(c) < i, `${r} costs a later realm's runes`));
  });
  const stats = new Set(Object.keys(D.baseStats));
  const all = [...D.upgrades, ...D.treeUpgrades, ...D.permUpgrades, ...D.fates, ...D.boons, ...D.curses].flatMap((x) => x.effects);
  all.forEach((e) => assert.ok(stats.has(e.stat) || /^(yield|unlockCost|upgradeScale|boonScale)_/.test(e.stat), e.stat));
});

test('the first Ragnarök pays a fixed amount, however much Asgard was upgraded', () => {
  const s = fresh();
  rich(s);
  while (Game.unlockNext(s));
  D.upgrades.filter((u) => u.realm === 'asgard').forEach((u) => { while (Game.buyUpgrade(s, u.id)); });
  s.run.runBlank = 1e30;
  assert.equal(Game.ragnarok(s).total, D.seeds.firstRun);
});

test('later Seed payouts grow slowly with runes mined', () => {
  const s = fresh();
  s.meta.ragnaroks = 1;
  s.run.runBlank = 1e12;
  const a = Game.seedReward(s).runes;
  s.run.runBlank = 1e24;
  const b = Game.seedReward(s).runes;
  assert.ok(b > a && b <= a * 4, `${a} -> ${b}`); // a trillion times more runes, at most 4x the Seeds
});

test('upgrades with a secondary realm cost both rune types', () => {
  const s = fresh();
  s.run.unlocked = D.realmOrder.slice(0, 5);
  const cost = Game.upgradeCost(s, 'mu_temper');
  assert.deepEqual(Object.keys(cost).sort(), ['muspelheim', 'niflheim']);
  s.run.runes.muspelheim = cost.muspelheim;
  assert.equal(Game.buyUpgrade(s, 'mu_temper'), false, 'needs the Niflheim runes too');
  s.run.runes.niflheim = cost.niflheim;
  assert.equal(Game.buyUpgrade(s, 'mu_temper'), true);
  assert.equal(s.run.runes.muspelheim, 0);
  assert.equal(s.run.runes.niflheim, 0);
});

test('imbue-missing makes exactly what the next unlock needs', () => {
  const s = fresh();
  s.run.blank = 1e6;
  assert.ok(Game.imbueMissing(s));
  assert.ok(Game.canUnlock(s));
  assert.ok(s.run.blank > 1e6 - 1000);
});

test('double imbues emit an event for the UI', () => {
  const s = fresh();
  s.run.blank = 1e4;
  s.run.fate = null;
  s.run.boons = { twin_spark: 3 };
  s.events = [];
  Game.rng = () => 0; // every roll succeeds
  Game.imbue(s, 'midgard', 5);
  const ev = s.events.find((e) => e.type === 'double');
  assert.ok(ev);
  assert.equal(ev.doubles, 5);
  assert.equal(s.run.runes.midgard, 10);
});

test('a Blank Rune stock above the cap is kept, not clamped into a negative gain', () => {
  const s = fresh();
  s.run.blank = Game.cap(s) * 3;
  const before = s.run.blank;
  Game.click(s);
  Game.tick(s, 1);
  assert.equal(s.run.blank, before);
  assert.equal(s.run.runBlank, 0);
  assert.ok(Number.isFinite(Game.productionRate(s)));
});
