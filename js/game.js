/*
 * Rune Clicker game logic. No DOM access here: everything operates on a plain
 * state object so it can be saved as JSON and tested in Node.
 */
(function (root) {
  'use strict';

  const Game = {};
  const D = () => root.RC.DATA;

  // Swappable for deterministic tests.
  Game.rng = Math.random;

  // ------------------------------------------------------------------ lookups
  const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
  let cache = null;
  function idx() {
    const d = D();
    if (!cache || cache.data !== d) {
      cache = {
        data: d,
        upgrades: byId(d.upgrades),
        tree: byId(d.treeUpgrades),
        perm: byId(d.permUpgrades),
        fates: byId(d.fates),
        boons: byId(d.boons),
        curses: byId(d.curses),
      };
    }
    return cache;
  }
  Game.lookup = idx;

  // ------------------------------------------------------------------ state
  function newMeta() {
    return {
      seeds: 0, totalSeeds: 0, ragnaroks: 0, perm: {}, discovered: {},
      lifetimeBlank: 0, bestTime: null, history: [], seenOnOwn: false, skippedTutorial: false,
    };
  }

  function permLevel(meta, id) { return meta.perm[id] || 0; }

  // The tutorial (run 1 with Odin's Blessing) ends at the first Ragnarök, or
  // when the player skips it. After that fates, boons and speed tiers apply.
  const tutorialDone = (meta) => meta.ragnaroks > 0 || !!meta.skippedTutorial;
  Game.tutorialDone = tutorialDone;
  Game.permLevel = permLevel;

  function newRun(meta) {
    const d = D();
    const run = {
      blank: 0, runes: {}, unlocked: ['midgard'], upgrades: {}, tree: {},
      fate: null, boons: {}, curses: [], timer: null,
      activeTime: 0, runBlank: 0, clicks: 0,
      streak: 0, lastClickAt: -999, bonusMiners: 0,
      pending: null, rerolls: 0, autoWeights: {},
      blessing: !tutorialDone(meta), ended: null,
    };
    d.realmOrder.forEach((r) => { run.runes[r] = 0; });
    const st = statsFor({ meta, run });
    run.blank = st.startBlank;
    run.bonusMiners = st.startMiners;
    run.rerolls = st.rerolls;
    if (tutorialDone(meta)) run.pending = { type: 'fate', options: rollFates(meta) };
    return run;
  }

  Game.newState = function () {
    const meta = newMeta();
    return { version: D().version, meta, run: newRun(meta), settings: { sound: true }, lastSaved: Date.now(), events: [] };
  };

  // ------------------------------------------------------------------ stats
  function applyEffect(st, eff, level, scale, value) {
    if (!level) return;
    const k = eff.stat;
    const v = value !== undefined ? value : eff.v;
    if (eff.op === 'mul') {
      const per = 1 + (v - 1) * scale;
      st[k] = (st[k] === undefined ? 1 : st[k]) * Math.pow(per, level);
    } else {
      st[k] = (st[k] === undefined ? 0 : st[k]) + v * level * scale;
    }
  }

  function get(st, k, def) { return st[k] === undefined ? def : st[k]; }
  Game.stat = get;

  function statsFor(s) {
    const d = D(), I = idx(), run = s.run, meta = s.meta;
    const st = Object.assign({}, d.baseStats);

    // Fate and curses first: they can scale other sources.
    if (run.fate && I.fates[run.fate]) I.fates[run.fate].effects.forEach((e) => applyEffect(st, e, 1, 1));
    run.curses.forEach((c) => I.curses[c] && I.curses[c].effects.forEach((e) => applyEffect(st, e, 1, 1)));

    for (const id in run.upgrades) {
      const u = I.upgrades[id];
      if (!u) continue;
      const scale = get(st, 'upgradeScale_' + u.realm, 1);
      u.effects.forEach((e) => applyEffect(st, e, run.upgrades[id], scale));
    }
    for (const id in run.tree) {
      const u = I.tree[id];
      if (u) u.effects.forEach((e) => applyEffect(st, e, run.tree[id], 1));
    }
    for (const id in meta.perm) {
      const u = I.perm[id];
      if (u) u.effects.forEach((e) => applyEffect(st, e, meta.perm[id], 1));
    }
    for (const id in run.boons) {
      const b = I.boons[id];
      if (!b) continue;
      const tier = run.boons[id];
      const scale = get(st, 'boonScale_' + b.realm, 1);
      b.effects.forEach((e) => applyEffect(st, e, 1, scale, e.t[Math.min(tier, e.t.length) - 1]));
    }
    return st;
  }
  Game.stats = statsFor;

  // ------------------------------------------------------------------ derived values
  const realmCount = (run) => run.unlocked.length;
  const has = (run, realm) => run.unlocked.includes(realm);
  Game.has = has;

  Game.globalMult = function (s, st) {
    const run = s.run, n = realmCount(run);
    return st.globalMult
      * (1 + st.globalPerRealm * n)
      * (1 + st.globalPerLogRunes * Math.log10(1 + run.runBlank))
      * (1 + st.lifetimePerLog * Math.log10(1 + s.meta.lifetimeBlank))
      * (1 + st.growthPerMin * run.activeTime / 60)
      * Math.max(0, 1 - st.tribute);
  };

  Game.minerCount = (s, st) => Math.floor(st.miners + s.run.bonusMiners);

  Game.overtimeActive = (s, st) => st.overtime > 0 && s.run.activeTime - s.run.lastClickAt < D().overtimeDuration;

  Game.minerRate = function (s, st, gm) {
    if (gm === undefined) gm = Game.globalMult(s, st);
    let r = Game.minerCount(s, st) * st.minerBase * st.minerMult * (1 + st.minerPerRealm * realmCount(s.run)) * gm;
    if (Game.overtimeActive(s, st)) r *= 1 + st.overtime;
    if (st.minerCrit) r *= 1 + Math.min(1, st.critChance) * (st.critMult - 1);
    return r;
  };

  Game.flatRate = (s, st, gm) => (st.flatRate + st.flatPerRealm * realmCount(s.run)) * gm;

  // Everything that would mine Blank Runes per second without clicking: miners,
  // flat income and stored-rune growth.
  Game.passiveRate = function (s, st, gm) {
    if (gm === undefined) gm = Game.globalMult(s, st);
    return Game.minerRate(s, st, gm) + Game.flatRate(s, st, gm) + s.run.blank * st.interest;
  };

  // Passive income actually received per second (excluding stored-rune growth,
  // which tick applies itself). Zero under a click-only fate (Ymir's Hands).
  Game.productionRate = function (s, st) {
    st = st || statsFor(s);
    if (st.clickOnly) return 0;
    const gm = Game.globalMult(s, st);
    return Game.minerRate(s, st, gm) + Game.flatRate(s, st, gm);
  };

  Game.streakBonus = (s, st) => Math.min(s.run.streak * D().streak.perClick, st.streakMax);

  Game.clickValue = function (s, st) {
    st = st || statsFor(s);
    const gm = Game.globalMult(s, st);
    // Forge Bond turns part of the miners' output into click power; Ymir's Hands
    // does the same with all passive income, which it otherwise switches off.
    const fromMiners = st.clickFromMiners * Game.minerRate(s, st, gm);
    const fromPassive = st.passiveToClick ? st.passiveToClick * Game.passiveRate(s, st, gm) : 0;
    return (st.clickFlat * gm + fromMiners + fromPassive) * st.clickMult * (1 + Game.streakBonus(s, st));
  };

  Game.cap = function (s, st) {
    st = st || statsFor(s);
    return st.capBase * st.capMult * Math.pow(D().capPerRealm, realmCount(s.run) - 1);
  };

  Game.imbueCost = function (s, realm, st) {
    st = st || statsFor(s);
    return D().realms[realm].imbueCost * Math.max(D().minImbueCostMult, st.imbueCostMult);
  };

  Game.imbueYield = function (s, realm, st) {
    st = st || statsFor(s);
    return st.yieldMult * get(st, 'yield_' + realm, 1);
  };

  const blessMult = (run, key) => (run.blessing ? D().blessing[key] : 1);

  // Returns { realm: amount }. Upgrades with `also` cost a share of an earlier
  // realm's runes too, worth secondaryCostShare of the main cost in Blank Runes.
  Game.upgradeCost = function (s, id, st) {
    st = st || statsFor(s);
    const d = D(), u = idx().upgrades[id];
    const lvl = s.run.upgrades[id] || 0;
    const main = u.base * Math.pow(u.growth, lvl) * blessMult(s.run, 'upgradeCostMult') * Math.max(d.minUpgradeCostMult, st.upgradeCostMult);
    const out = { [u.realm]: Math.ceil(main) };
    if (u.also) out[u.also] = Math.ceil(main * d.secondaryCostShare * d.realms[u.realm].imbueCost / d.realms[u.also].imbueCost);
    return out;
  };

  Game.treeCost = function (s, id, st) {
    st = st || statsFor(s);
    const u = idx().tree[id];
    const lvl = s.run.tree[id] || 0;
    const m = Math.pow(u.growth, lvl) * blessMult(s.run, 'upgradeCostMult') * Math.max(D().minUpgradeCostMult, st.upgradeCostMult);
    const out = {};
    for (const r in u.cost) out[r] = Math.ceil(u.cost[r] * m);
    return out;
  };

  Game.permCost = function (s, id) {
    const u = idx().perm[id];
    return Math.ceil(u.base * Math.pow(u.growth, permLevel(s.meta, id)));
  };

  Game.nextRealm = (s) => D().realmOrder[s.run.unlocked.length] || null;

  Game.unlockCost = function (s, realm, st) {
    st = st || statsFor(s);
    const r = D().realms[realm];
    const m = Math.max(D().minUnlockCostMult, st.unlockCostMult * get(st, 'unlockCost_' + realm, 1)) * blessMult(s.run, 'unlockCostMult');
    const out = {};
    for (const c in r.unlock) out[c] = Math.ceil(r.unlock[c] * m);
    return out;
  };

  const canAfford = (run, cost) => Object.keys(cost).every((c) => run.runes[c] >= cost[c] - 1e-9);
  const pay = (run, cost) => { for (const c in cost) run.runes[c] = Math.max(0, run.runes[c] - cost[c]); };
  Game.canAfford = canAfford;

  // ------------------------------------------------------------------ events (UI notifications)
  function emit(s, type, payload) {
    if (!s.events) s.events = [];
    s.events.push(Object.assign({ type }, payload));
  }

  function discover(s, key) {
    if (s.meta.discovered[key]) return;
    s.meta.discovered[key] = true;
    emit(s, 'discover', { key });
  }

  function addBlank(s, amount, st) {
    const run = s.run;
    const cap = Game.cap(s, st);
    const before = run.blank;
    // Never take runes away: a stock above the cap (e.g. a starting bonus) just stops growing.
    if (amount <= 0 || before >= cap) return 0;
    run.blank = Math.min(cap, before + amount);
    const gained = run.blank - before;
    run.runBlank += gained;
    s.meta.lifetimeBlank += gained;
    if (gained > 0) discover(s, 'blank');
    return gained;
  }

  const frozen = (s) => !!(s.run.pending || s.run.ended);
  Game.frozen = frozen;

  // ------------------------------------------------------------------ actions
  Game.click = function (s) {
    if (frozen(s)) return null;
    const run = s.run, d = D();
    const st = statsFor(s);
    if (run.activeTime - run.lastClickAt <= d.streak.window) run.streak++;
    else run.streak = 1;
    run.lastClickAt = run.activeTime;
    run.clicks++;
    let amount = Game.clickValue(s, st);
    const crit = Game.rng() < st.critChance;
    if (crit) amount *= st.critMult;
    const gained = addBlank(s, amount, st);
    return { amount, gained, crit, capped: gained < amount - 1e-9 };
  };

  Game.maxImbuable = function (s, realm, st) {
    st = st || statsFor(s);
    return Math.floor(s.run.blank / Game.imbueCost(s, realm, st) + 1e-9);
  };

  // n: number of imbues, or 'max'
  Game.imbue = function (s, realm, n) {
    if (frozen(s) || !has(s.run, realm)) return 0;
    const st = statsFor(s);
    const max = Game.maxImbuable(s, realm, st);
    if (n === 'max') n = max;
    n = Math.min(n, max);
    if (n <= 0) return 0;
    const run = s.run;
    run.blank = Math.max(0, run.blank - n * Game.imbueCost(s, realm, st));
    let doubles = 0;
    if (st.doubleChance > 0) {
      if (n <= 100) { for (let i = 0; i < n; i++) if (Game.rng() < st.doubleChance) doubles++; }
      else doubles = Math.floor(n * Math.min(1, st.doubleChance) + Game.rng());
    }
    const yld = Game.imbueYield(s, realm, st);
    const gained = (n + doubles) * yld;
    run.runes[realm] += gained;
    discover(s, realm);
    if (doubles > 0) emit(s, 'double', { realm, doubles, extra: doubles * yld });
    return gained;
  };

  // Imbue exactly what the next realm unlock still needs. When Blank Runes
  // fall short, every missing rune type gets the same share of them.
  Game.imbueMissing = function (s) {
    const next = Game.nextRealm(s);
    if (!next || frozen(s)) return false;
    const st = statsFor(s), run = s.run;
    const cost = Game.unlockCost(s, next, st);
    const needs = Object.keys(cost).map((r) => {
      const n = Math.ceil(Math.max(0, cost[r] - run.runes[r]) / Game.imbueYield(s, r, st) - 1e-9);
      return { r, n, blank: n * Game.imbueCost(s, r, st) };
    }).filter((x) => x.n > 0);
    const total = needs.reduce((a, x) => a + x.blank, 0);
    if (!total) return false;
    const share = Math.min(1, run.blank / total);
    let any = false;
    needs.forEach((x) => { if (Game.imbue(s, x.r, Math.floor(x.n * share + 1e-9)) > 0) any = true; });
    return any;
  };

  Game.buyUpgrade = function (s, id) {
    if (frozen(s)) return false;
    const u = idx().upgrades[id], run = s.run;
    if (!u || !has(run, u.realm)) return false;
    const lvl = run.upgrades[id] || 0;
    if (lvl >= u.max) return false;
    const st = statsFor(s);
    const cost = Game.upgradeCost(s, id, st);
    if (!canAfford(run, cost)) return false;
    pay(run, cost);
    run.upgrades[id] = lvl + 1;
    if (id === 's_miner' && st.freeMinerChance > 0 && Game.rng() < st.freeMinerChance) {
      run.bonusMiners++;
      emit(s, 'freeMiner', {});
    }
    return true;
  };

  Game.treeAvailable = (s, id) => idx().tree[id].requires.every((r) => has(s.run, r));

  Game.buyTree = function (s, id) {
    if (frozen(s)) return false;
    const u = idx().tree[id], run = s.run;
    if (!u || !Game.treeAvailable(s, id)) return false;
    const lvl = run.tree[id] || 0;
    if (lvl >= u.max) return false;
    const cost = Game.treeCost(s, id);
    if (!canAfford(run, cost)) return false;
    pay(run, cost);
    run.tree[id] = lvl + 1;
    return true;
  };

  Game.buyPerm = function (s, id) {
    const u = idx().perm[id];
    if (!u) return false;
    const lvl = permLevel(s.meta, id);
    if (lvl >= u.max) return false;
    const cost = Game.permCost(s, id);
    if (s.meta.seeds < cost) return false;
    s.meta.seeds -= cost;
    s.meta.perm[id] = lvl + 1;
    // Rerolls bought mid-run apply immediately.
    u.effects.forEach((e) => { if (e.stat === 'rerolls') s.run.rerolls += e.v; });
    return true;
  };

  Game.canUnlock = function (s) {
    const next = Game.nextRealm(s);
    return !!next && canAfford(s.run, Game.unlockCost(s, next));
  };

  Game.unlockNext = function (s) {
    if (frozen(s)) return false;
    const next = Game.nextRealm(s);
    if (!next) return false;
    const cost = Game.unlockCost(s, next);
    if (!canAfford(s.run, cost)) return false;
    pay(s.run, cost);
    s.run.unlocked.push(next);
    emit(s, 'unlock', { realm: next });
    if (next === 'asgard' && s.run.timer) {
      emit(s, 'timerBeaten', { curse: s.run.timer.curse });
      s.run.timer = null;
    }
    if (tutorialDone(s.meta)) {
      const options = rollBoonOffer(s, next);
      if (options.length) s.run.pending = { type: 'boon', realm: next, options };
    }
    return true;
  };

  Game.ragnarokReady = (s) => has(s.run, 'asgard');

  // Skip the tutorial: the current run restarts as a full run (fate pick,
  // boons, speed tiers) without Odin's Blessing or the first-Ragnarök gift.
  Game.skipTutorial = function (s) {
    if (tutorialDone(s.meta)) return false;
    s.meta.skippedTutorial = true;
    s.run = newRun(s.meta);
    return true;
  };

  // ------------------------------------------------------------------ fates, boons, curses
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Game.rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function rollFates(meta) {
    const pool = D().fates.filter((f) => !f.pack || permLevel(meta, 'shop_fates'));
    return shuffle(pool.map((f) => f.id)).slice(0, 3);
  }

  Game.maxBoonTier = (s) => D().boonTiers + (permLevel(s.meta, 'shop_tiers') ? 1 : 0);

  function boonOpen(s, b) { return (s.run.boons[b.id] || 0) < Game.maxBoonTier(s); }

  function rollBoonOffer(s, realm) {
    const d = D(), run = s.run;
    const wander = permLevel(s.meta, 'shop_boons') > 0;
    let primary = d.boons.filter((b) => (b.realm === realm || (wander && b.realm === 'any')) && boonOpen(s, b));
    primary = shuffle(primary).slice(0, 3);
    if (primary.length < 3) {
      const older = d.boons.filter((b) => b.realm !== 'any' && b.realm !== realm && has(run, b.realm) && boonOpen(s, b) && !primary.includes(b));
      primary = primary.concat(shuffle(older).slice(0, 3 - primary.length));
    }
    const options = primary.map((b) => ({ kind: 'boon', id: b.id }));
    if (permLevel(s.meta, 'shop_curses') && options.length && Game.rng() < d.curseOfferChance) {
      const curses = d.curses.filter((c) => !run.curses.includes(c.id) && !(c.timer && has(run, 'asgard')));
      if (curses.length) {
        const c = curses[Math.floor(Game.rng() * curses.length)];
        options[Math.floor(Game.rng() * options.length)] = { kind: 'curse', id: c.id };
      }
    }
    return options;
  }

  function gainBoon(s, id) {
    const run = s.run;
    const b = idx().boons[id];
    run.boons[id] = Math.min(Game.maxBoonTier(s), (run.boons[id] || 0) + 1);
    b.effects.forEach((e) => {
      if (e.stat === 'rerolls') {
        const t = run.boons[id];
        run.rerolls += e.t[t - 1] - (t > 1 ? e.t[t - 2] : 0);
      }
    });
  }

  Game.choose = function (s, i) {
    const p = s.run.pending, run = s.run;
    if (!p || !p.options[i]) return false;
    if (p.type === 'fate') {
      const f = idx().fates[p.options[i]];
      run.fate = f.id;
      if (f.special === 'freeBoon') {
        const pool = D().boons.filter((b) => b.realm !== 'any');
        const b = pool[Math.floor(Game.rng() * pool.length)];
        gainBoon(s, b.id);
        emit(s, 'freeBoon', { boon: b.id });
      }
    } else {
      const o = p.options[i];
      if (o.kind === 'boon') gainBoon(s, o.id);
      else {
        const c = idx().curses[o.id];
        run.curses.push(c.id);
        if (c.timer) {
          const endsAt = run.activeTime + c.timer;
          if (!run.timer || endsAt < run.timer.endsAt) run.timer = { curse: c.id, endsAt };
        }
      }
    }
    run.pending = null;
    return true;
  };

  Game.reroll = function (s) {
    const p = s.run.pending;
    if (!p || s.run.rerolls <= 0) return false;
    s.run.rerolls--;
    p.options = p.type === 'fate' ? rollFates(s.meta) : rollBoonOffer(s, p.realm);
    return true;
  };

  // ------------------------------------------------------------------ Ragnarök
  Game.speedTier = function (s) {
    if (!tutorialDone(s.meta)) return null;
    const t = s.run.activeTime;
    return D().seeds.speedTiers.find((x) => t <= x.max);
  };

  Game.nextSpeedTarget = function (s) {
    if (!tutorialDone(s.meta)) return null;
    const t = s.run.activeTime;
    return D().seeds.speedTiers.find((x) => t <= x.max && x.bonus > 0) || null;
  };

  Game.seedReward = function (s, failed) {
    const d = D(), I = idx(), run = s.run;
    const st = statsFor(s);
    const base = d.seeds.base + st.seedFlat;
    // Log curve: production explodes late, so a root curve would pay out far too much.
    const runes = Math.max(0, Math.floor(d.seeds.runeLogMult * Math.log10(Math.max(1, run.runBlank / d.seeds.runeDiv))));
    // The tutorial run pays a fixed amount so lingering in Asgard can't snowball it.
    if (!tutorialDone(s.meta) && !failed) {
      return { base, runes, tier: null, speedBonus: 0, curseMult: 1, fateMult: 1, seedMult: 1, failed: false, firstRun: true, total: d.seeds.firstRun };
    }
    const tier = failed ? null : Game.speedTier(s);
    const speedBonus = tier ? tier.bonus : 0;
    const curseMult = run.curses.reduce((m, c) => m * (I.curses[c] ? I.curses[c].seedMult : 1), 1);
    const fate = run.fate && I.fates[run.fate];
    const fateMult = (fate && fate.seedMult) || 1;
    let total = Math.floor((base + runes) * st.seedMult * curseMult * fateMult * (1 + speedBonus));
    if (failed) total = Math.floor(total * d.seeds.failMult);
    return { base, runes, tier, speedBonus, curseMult, fateMult, seedMult: st.seedMult, failed: !!failed, total: Math.max(1, total) };
  };

  Game.ragnarok = function (s) {
    const failed = !!(s.run.ended && s.run.ended.failed);
    if (!failed && !Game.ragnarokReady(s)) return null;
    const reward = Game.seedReward(s, failed);
    const meta = s.meta;
    meta.seeds += reward.total;
    meta.totalSeeds += reward.total;
    const first = !tutorialDone(meta);
    meta.ragnaroks++;
    if (!failed && (meta.bestTime === null || s.run.activeTime < meta.bestTime)) meta.bestTime = s.run.activeTime;
    meta.history.push({ time: Math.round(s.run.activeTime), seeds: reward.total, failed, fate: s.run.fate, curses: s.run.curses.slice() });
    if (meta.history.length > 20) meta.history.shift();
    s.run = newRun(meta);
    return Object.assign({ first }, reward);
  };

  // ------------------------------------------------------------------ tick
  Game.tick = function (s, dt, offline) {
    if (frozen(s) || dt <= 0) return;
    const d = D(), run = s.run;
    run.activeTime += offline ? dt * d.offline.clockRate : dt;
    if (run.activeTime - run.lastClickAt > d.streak.decay) run.streak = 0;

    const st = statsFor(s);
    let rate = Game.productionRate(s, st);
    if (offline) rate *= st.offlineRate;
    addBlank(s, rate * dt + (st.clickOnly ? 0 : run.blank * st.interest * dt), st);

    // Auto-imbue: continuously spend a share of Blank Runes across weighted realms.
    if (permLevel(s.meta, 'shop_auto')) {
      const weights = run.unlocked.map((r) => [r, run.autoWeights[r] || 0]).filter((x) => x[1] > 0);
      const total = weights.reduce((a, x) => a + x[1], 0);
      if (total > 0) {
        const budget = run.blank * Math.min(1, d.autoImbue.ratePerSec * dt);
        run.blank -= budget;
        const expDouble = 1 + Math.min(1, st.doubleChance);
        weights.forEach(([r, w]) => {
          const n = (budget * w / total) / Game.imbueCost(s, r, st);
          run.runes[r] += n * expDouble * Game.imbueYield(s, r, st);
          if (n > 0) discover(s, r);
        });
      }
    }

    if (run.timer && run.activeTime >= run.timer.endsAt && !has(run, 'asgard')) {
      run.ended = { failed: true, curse: run.timer.curse };
      emit(s, 'failed', { curse: run.timer.curse });
    }
  };

  // Apply time away from the game. Returns a summary or null.
  Game.applyOffline = function (s, seconds) {
    const d = D();
    if (seconds < d.offline.minSeconds || frozen(s)) return null;
    const st = statsFor(s);
    const capSec = st.offlineCapH * st.offlineCapMult * 3600;
    const used = Math.min(seconds, capSec);
    const before = s.run.blank, beforeRunes = Object.assign({}, s.run.runes), beforeMined = s.run.runBlank;
    const steps = Math.min(d.offline.maxSteps, Math.max(1, Math.ceil(used)));
    const dt = used / steps;
    for (let i = 0; i < steps && !frozen(s); i++) Game.tick(s, dt, true);
    const runes = {};
    for (const r in s.run.runes) {
      const g = s.run.runes[r] - (beforeRunes[r] || 0);
      if (g > 0.0001) runes[r] = g;
    }
    return { seconds, used, capped: seconds > capSec, clickOnly: !!st.clickOnly, mined: s.run.runBlank - beforeMined, blankDelta: s.run.blank - before, runes };
  };

  // ------------------------------------------------------------------ save / load
  Game.serialize = function (s) {
    const copy = Object.assign({}, s, { events: undefined, lastSaved: Date.now() });
    return JSON.stringify(copy);
  };

  Game.deserialize = function (str) {
    const loaded = JSON.parse(str);
    const fresh = Game.newState();
    if (!loaded || !loaded.meta || !loaded.run) return fresh;
    const s = {
      version: D().version,
      meta: Object.assign(newMeta(), loaded.meta),
      run: Object.assign({}, fresh.run, loaded.run),
      settings: Object.assign({}, fresh.settings, loaded.settings),
      lastSaved: loaded.lastSaved || Date.now(),
      events: [],
    };
    // Repair any non-finite numbers (older builds could produce NaN).
    const finite = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
    D().realmOrder.forEach((r) => { s.run.runes[r] = finite(s.run.runes[r]); });
    ['blank', 'runBlank', 'activeTime'].forEach((k) => { s.run[k] = finite(s.run[k]); });
    s.meta.lifetimeBlank = finite(s.meta.lifetimeBlank);
    return s;
  };

  root.RC = root.RC || {};
  root.RC.Game = Game;
  if (typeof module !== 'undefined' && module.exports) module.exports = Game;
})(typeof globalThis !== 'undefined' ? globalThis : this);
