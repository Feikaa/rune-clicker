/*
 * Rune Clicker balance data.
 * Every tuning number lives in this file so balancing never touches game code.
 *
 * Effect format: { stat, op, v }
 *   op 'add': stat += v * level
 *   op 'mul': stat *= v ^ level
 * Boons use { stat, op, t: [tier1, tier2, tier3, tier4] } instead of v.
 */
(function (root) {
  'use strict';

  const DATA = {
    version: 1,

    // ---------------------------------------------------------------- base
    baseStats: {
      clickFlat: 1, clickMult: 1, clickFromMiners: 0,
      miners: 0, minerBase: 0.2, minerMult: 1, minerPerRealm: 0, minerCrit: 0,
      flatRate: 0, flatPerRealm: 0,
      globalMult: 1, globalPerRealm: 0, globalPerLogRunes: 0, lifetimePerLog: 0, growthPerMin: 0,
      capBase: 300, capMult: 1, interest: 0,
      offlineRate: 0.25, offlineCapH: 2, offlineCapMult: 1,
      imbueCostMult: 1, yieldMult: 1,
      unlockCostMult: 1, upgradeCostMult: 1,
      critChance: 0, critMult: 5, doubleChance: 0,
      streakMax: 0.25,
      seedMult: 1, seedFlat: 0,
      overtime: 0, freeMinerChance: 0, tribute: 0,
      startBlank: 0, startMiners: 0, rerolls: 0,
    },

    // Blank Rune storage cap grows by this factor for each realm unlocked.
    capPerRealm: 4,
    // Floors so stacked discounts can't trivialise costs.
    minImbueCostMult: 0.25,
    minUpgradeCostMult: 0.4,
    minUnlockCostMult: 0.3,
    // Upgrades with `also: realm` cost that earlier realm's runes too, worth this
    // share of the main cost (measured in Blank Runes).
    secondaryCostShare: 0.5,

    streak: { window: 1.0, decay: 1.5, perClick: 0.01 },
    overtimeDuration: 60,

    blessing: { name: "Odin's Blessing", unlockCostMult: 0.25, upgradeCostMult: 0.4 },

    offline: { clockRate: 0.25, minSeconds: 10, maxSteps: 300 },
    autoImbue: { ratePerSec: 0.5 },

    seeds: {
      firstRun: 5,        // the tutorial run pays a fixed amount
      base: 6,
      runeDiv: 1e8,       // reward from runes = floor(runeLogMult * log10(runBlank / runeDiv))
      runeLogMult: 1.5,
      failMult: 0.5,
      // Checked in order: first tier whose max (seconds of run clock) is not exceeded.
      speedTiers: [
        { id: 'blitz', name: 'Blitz', max: 12 * 60, bonus: 0.5 },
        { id: 'swift', name: 'Swift', max: 18 * 60, bonus: 0.25 },
        { id: 'steady', name: 'Steady', max: 30 * 60, bonus: 0.1 },
        { id: 'slow', name: 'Slow', max: Infinity, bonus: 0 },
      ],
    },

    boonTiers: 3,       // shop_tiers raises this by 1
    curseOfferChance: 0.4,

    // ---------------------------------------------------------------- realms
    realmOrder: ['midgard', 'svartalfheim', 'niflheim', 'muspelheim', 'jotunheim', 'helheim', 'alfheim', 'vanaheim', 'asgard'],

    realms: {
      midgard: {
        name: 'Midgard', rune: 'Mannaz', glyph: 'mannaz', color: '#d8b46a',
        theme: 'Realm of humans', job: 'Click power and cheap early upgrades.',
        imbueCost: 10, unlock: null,
        discovery: 'Mannaz. The rune of humankind, carved by your own hand.',
      },
      svartalfheim: {
        name: 'Svartalfheim', rune: 'Uruz', glyph: 'uruz', color: '#c9824a',
        theme: 'Forges of the dwarves', job: 'Auto-miners. Your first idle income.',
        imbueCost: 50, unlock: { midgard: 15 },
        discovery: 'Uruz. Dwarven ore-strength. The forges below begin to ring.',
      },
      niflheim: {
        name: 'Niflheim', rune: 'Isa', glyph: 'isa', color: '#8fd3ff',
        theme: 'Ice and mist', job: 'Storage caps and offline progress.',
        imbueCost: 250, unlock: { midgard: 135, svartalfheim: 27 },
        discovery: 'Isa. Ice holds what fire would spend.',
      },
      muspelheim: {
        name: 'Muspelheim', rune: 'Kenaz', glyph: 'kenaz', color: '#ff6a3d',
        theme: 'Fire', job: 'Imbuing efficiency and multipliers.',
        imbueCost: 1250, unlock: { svartalfheim: 500, niflheim: 100 },
        discovery: 'Kenaz. The torch of Surtr. Every forge burns hotter now.',
      },
      jotunheim: {
        name: 'Jotunheim', rune: 'Thurisaz', glyph: 'thurisaz', color: '#a7b4c2',
        theme: 'Giants', job: 'Large flat production boosts.',
        imbueCost: 6000, unlock: { midgard: 30000, niflheim: 1200, muspelheim: 240 },
        discovery: 'Thurisaz. The giants lend their strength, for now.',
      },
      helheim: {
        name: 'Helheim', rune: 'Hagalaz', glyph: 'hagalaz', color: '#7fd6a8',
        theme: 'The dead', job: 'Souls: automation efficiency and offline progress.',
        imbueCost: 30000, unlock: { svartalfheim: 100000, muspelheim: 4000, jotunheim: 900 },
        discovery: 'Hagalaz. The dead do not tire. Neither will your mines.',
      },
      alfheim: {
        name: 'Alfheim', rune: 'Sowilo', glyph: 'sowilo', color: '#fff0a0',
        theme: 'Light elves', job: 'Luck: crits and double imbues.',
        imbueCost: 150000, unlock: { niflheim: 400000, jotunheim: 15000, helheim: 3000 },
        discovery: 'Sowilo. Elven light makes fortune easier to find.',
      },
      vanaheim: {
        name: 'Vanaheim', rune: 'Jera', glyph: 'jera', color: '#9be36b',
        theme: 'The Vanir', job: 'Compounding growth.',
        imbueCost: 750000, unlock: { muspelheim: 1400000, helheim: 60000, alfheim: 12000 },
        discovery: 'Jera. The harvest rune. What you plant, grows.',
      },
      asgard: {
        name: 'Asgard', rune: 'Ansuz', glyph: 'ansuz', color: '#ffd34d',
        theme: 'The gods', job: 'Endgame upgrades. Unlocking it enables Ragnarök.',
        imbueCost: 4000000, unlock: { jotunheim: 5000000, alfheim: 200000, vanaheim: 40000 },
        discovery: 'Ansuz. The voice of Odin. The end of the world is now within reach.',
      },
    },

    // ---------------------------------------------------------------- realm upgrades
    // Cost (in the realm's own runes) = base * growth^level.
    upgrades: [
      // Midgard
      { id: 'm_chisel', realm: 'midgard', name: 'Sharpened Chisel', desc: '+1 Blank Rune per click', base: 3, growth: 1.5, max: 25, effects: [{ stat: 'clickFlat', op: 'add', v: 1 }] },
      { id: 'm_hand', realm: 'midgard', name: 'Steady Hand', desc: 'Click power ×1.25', base: 12, growth: 3, max: 6, effects: [{ stat: 'clickMult', op: 'mul', v: 1.25 }] },
      { id: 'm_rhythm', realm: 'midgard', name: 'Rhythm of the Hammer', desc: 'Click streak cap +10%', base: 8, growth: 2, max: 5, effects: [{ stat: 'streakMax', op: 'add', v: 0.1 }] },
      { id: 'm_satchel', realm: 'midgard', name: 'Bigger Satchel', desc: 'Blank Rune cap ×1.5', base: 6, growth: 1.8, max: 12, effects: [{ stat: 'capMult', op: 'mul', v: 1.5 }] },
      { id: 'm_tales', icon: 'sun', realm: 'midgard', name: 'Hearth Tales', desc: 'All production ×1.1', base: 40, growth: 3.5, max: 4, effects: [{ stat: 'globalMult', op: 'mul', v: 1.1 }] },

      // Svartalfheim
      { id: 's_miner', realm: 'svartalfheim', name: 'Dwarven Miner', desc: '+1 auto-miner', base: 2, growth: 1.17, max: 150, effects: [{ stat: 'miners', op: 'add', v: 1 }] },
      { id: 's_shafts', realm: 'svartalfheim', name: 'Deeper Shafts', desc: '+0.1 Blank Runes/s per miner', base: 6, growth: 2, max: 8, effects: [{ stat: 'minerBase', op: 'add', v: 0.1 }] },
      { id: 's_picks', realm: 'svartalfheim', name: 'Rune-Steel Picks', desc: 'Miners ×1.4', base: 10, growth: 3, max: 6, effects: [{ stat: 'minerMult', op: 'mul', v: 1.3 }] },
      { id: 's_bond', realm: 'svartalfheim', also: 'midgard', name: 'Forge Bond', desc: 'Clicks add 2% of miner rate', base: 15, growth: 3, max: 5, effects: [{ stat: 'clickFromMiners', op: 'add', v: 0.02 }] },
      { id: 's_ingots', realm: 'svartalfheim', name: 'Ingot Stacks', desc: 'Blank Rune cap ×1.4', base: 8, growth: 2, max: 10, effects: [{ stat: 'capMult', op: 'mul', v: 1.4 }] },

      // Niflheim
      { id: 'n_vault', realm: 'niflheim', also: 'svartalfheim', name: 'Glacier Vault', desc: 'Blank Rune cap ×2', base: 6, growth: 2.2, max: 15, effects: [{ stat: 'capMult', op: 'mul', v: 2 }] },
      { id: 'n_frozen', realm: 'niflheim', also: 'midgard', name: 'Frozen Time', desc: 'Offline rate +10%', base: 10, growth: 2, max: 5, effects: [{ stat: 'offlineRate', op: 'add', v: 0.1 }] },
      { id: 'n_winter', realm: 'niflheim', also: 'midgard', name: 'Long Winter', desc: 'Offline cap +1 hour', base: 8, growth: 1.8, max: 8, effects: [{ stat: 'offlineCapH', op: 'add', v: 1 }] },
      { id: 'n_still', realm: 'niflheim', also: 'svartalfheim', name: 'Still Waters', desc: 'Stored Blank Runes grow 0.03%/s', base: 20, growth: 3, max: 5, effects: [{ stat: 'interest', op: 'add', v: 0.0001 }] },

      // Muspelheim
      { id: 'mu_forge', realm: 'muspelheim', also: 'svartalfheim', name: 'Hotter Forge', desc: 'Imbue cost ×0.9', base: 12, growth: 3, max: 5, effects: [{ stat: 'imbueCostMult', op: 'mul', v: 0.9 }] },
      { id: 'mu_temper', realm: 'muspelheim', also: 'niflheim', name: 'Fire-Tempered', desc: 'All imbue yields ×1.1', base: 24, growth: 3, max: 5, effects: [{ stat: 'yieldMult', op: 'mul', v: 1.1 }] },
      { id: 'mu_molten', realm: 'muspelheim', also: 'midgard', name: 'Molten Strike', desc: 'Click power ×1.4', base: 20, growth: 3, max: 5, effects: [{ stat: 'clickMult', op: 'mul', v: 1.3 }] },
      { id: 'mu_bellows', realm: 'muspelheim', also: 'svartalfheim', name: 'Great Bellows', desc: 'Miners ×1.3', base: 32, growth: 3, max: 5, effects: [{ stat: 'minerMult', op: 'mul', v: 1.25 }] },
      { id: 'mu_anvil', realm: 'muspelheim', also: 'niflheim', name: "Surtr's Anvil", desc: 'All production ×1.2', base: 40, growth: 3.5, max: 5, effects: [{ stat: 'globalMult', op: 'mul', v: 1.15 }] },

      // Jotunheim
      { id: 'j_labor', realm: 'jotunheim', also: 'midgard', name: 'Giant Labor', desc: '+20 Blank Runes/s', base: 30, growth: 1.7, max: 20, effects: [{ stat: 'flatRate', op: 'add', v: 25 }] },
      { id: 'j_fist', icon: 'boulder', realm: 'jotunheim', also: 'muspelheim', name: "Giant's Fist", desc: '+15 Blank Runes per click', base: 30, growth: 1.8, max: 15, effects: [{ stat: 'clickFlat', op: 'add', v: 15 }] },
      { id: 'j_haul', realm: 'jotunheim', also: 'svartalfheim', name: 'Stone Haulers', desc: '+5 auto-miners', base: 50, growth: 2, max: 10, effects: [{ stat: 'miners', op: 'add', v: 5 }] },
      { id: 'j_strength', realm: 'jotunheim', also: 'niflheim', name: 'Titan Strength', desc: 'All production ×1.25', base: 80, growth: 3.5, max: 5, effects: [{ stat: 'globalMult', op: 'mul', v: 1.2 }] },
      { id: 'j_hall', realm: 'jotunheim', also: 'niflheim', name: 'Mountain Halls', desc: 'Blank Rune cap ×2', base: 60, growth: 2.2, max: 8, effects: [{ stat: 'capMult', op: 'mul', v: 2 }] },

      // Helheim
      { id: 'h_draugr', icon: 'skull', realm: 'helheim', also: 'midgard', name: 'Draugr Shift', desc: '+0.1 Blank Runes/s per miner', base: 120, growth: 2.2, max: 8, effects: [{ stat: 'minerBase', op: 'add', v: 0.1 }] },
      { id: 'h_restless', icon: 'skull', realm: 'helheim', also: 'svartalfheim', name: 'Restless Dead', desc: 'Miners ×1.2', base: 90, growth: 3, max: 6, effects: [{ stat: 'minerMult', op: 'mul', v: 1.2 }] },
      { id: 'h_engine', realm: 'helheim', also: 'muspelheim', name: 'Soul Engine', desc: 'Miners +3% per realm unlocked', base: 240, growth: 3, max: 6, effects: [{ stat: 'minerPerRealm', op: 'add', v: 0.03 }] },
      { id: 'h_halls', realm: 'helheim', also: 'niflheim', name: "Hel's Halls", desc: 'Offline rate +15%, offline cap +2h', base: 150, growth: 2, max: 5, effects: [{ stat: 'offlineRate', op: 'add', v: 0.15 }, { stat: 'offlineCapH', op: 'add', v: 2 }] },
      { id: 'h_ferry', icon: 'boat', realm: 'helheim', also: 'jotunheim', name: 'Soul Ferry', desc: 'Imbue cost ×0.9', base: 300, growth: 3.5, max: 3, effects: [{ stat: 'imbueCostMult', op: 'mul', v: 0.9 }] },

      // Alfheim
      { id: 'a_sight', realm: 'alfheim', also: 'midgard', name: 'Elven Sight', desc: 'Crit chance +2%', base: 180, growth: 2, max: 10, effects: [{ stat: 'critChance', op: 'add', v: 0.02 }] },
      { id: 'a_radiance', realm: 'alfheim', also: 'muspelheim', name: 'Radiance', desc: 'Crit power +0.5×', base: 300, growth: 2.2, max: 8, effects: [{ stat: 'critMult', op: 'add', v: 0.5 }] },
      { id: 'a_twin', realm: 'alfheim', also: 'jotunheim', name: 'Twin Light', desc: 'Double imbue chance +4%', base: 240, growth: 2, max: 8, effects: [{ stat: 'doubleChance', op: 'add', v: 0.04 }] },
      { id: 'a_lucky', realm: 'alfheim', also: 'helheim', name: 'Lucky Strikes', desc: 'Miners can crit too', base: 1200, growth: 1, max: 1, effects: [{ stat: 'minerCrit', op: 'add', v: 1 }] },
      { id: 'a_glow', realm: 'alfheim', also: 'muspelheim', name: 'Elven Glow', desc: 'All production ×1.2', base: 600, growth: 3.5, max: 5, effects: [{ stat: 'globalMult', op: 'mul', v: 1.15 }] },

      // Vanaheim
      { id: 'v_seidr', realm: 'vanaheim', also: 'alfheim', name: 'Seidr Growth', desc: 'Production +2% per minute this run', base: 360, growth: 3, max: 6, effects: [{ stat: 'growthPerMin', op: 'add', v: 0.01 }] },
      { id: 'v_fields', realm: 'vanaheim', also: 'midgard', name: 'Fertile Fields', desc: 'Production +2% per digit of runes mined this run', base: 600, growth: 3, max: 5, effects: [{ stat: 'globalPerLogRunes', op: 'add', v: 0.02 }] },
      { id: 'v_bounty', realm: 'vanaheim', also: 'jotunheim', name: 'Bountiful Harvest', desc: 'All imbue yields ×1.1', base: 720, growth: 3, max: 5, effects: [{ stat: 'yieldMult', op: 'mul', v: 1.1 }] },
      { id: 'v_grace', realm: 'vanaheim', also: 'alfheim', name: "Freyja's Grace", desc: 'Upgrade costs ×0.95', base: 960, growth: 3, max: 5, effects: [{ stat: 'upgradeCostMult', op: 'mul', v: 0.95 }] },

      // Asgard
      { id: 'as_record', realm: 'asgard', also: 'helheim', name: "Valhalla's Record", desc: 'Seeds from Ragnarök ×1.1', base: 200, growth: 3, max: 5, effects: [{ stat: 'seedMult', op: 'mul', v: 1.1 }] },
      { id: 'as_hlid', realm: 'asgard', also: 'alfheim', name: 'Hlidskjalf', desc: '+1 Seed from Ragnarök', base: 300, growth: 3, max: 5, effects: [{ stat: 'seedFlat', op: 'add', v: 1 }] },
      { id: 'as_bifrost', icon: 'rainbow', realm: 'asgard', also: 'vanaheim', name: 'Bifrost', desc: 'All production ×1.5', base: 100, growth: 3, max: 6, effects: [{ stat: 'globalMult', op: 'mul', v: 1.5 }] },
      { id: 'as_mjolnir', realm: 'asgard', also: 'jotunheim', name: 'Mjolnir', desc: 'Click power ×2', base: 100, growth: 3, max: 6, effects: [{ stat: 'clickMult', op: 'mul', v: 2 }] },
    ],

    // ---------------------------------------------------------------- World Tree (run-based)
    // Bought with several rune types, reset by Ragnarök.
    treeUpgrades: [
      { id: 't_ratatoskr', icon: 'leaf', name: "Ratatoskr's Errands", desc: 'The squirrel runs runes between branches: all imbue yields ×1.15', cost: { midgard: 20, svartalfheim: 5 }, growth: 3, max: 3, requires: ['svartalfheim'], effects: [{ stat: 'yieldMult', op: 'mul', v: 1.15 }] },
      { id: 't_branches', icon: 'branches', name: 'Many Branches', desc: 'All production +5% per realm unlocked', cost: { midgard: 30, svartalfheim: 10 }, growth: 2.5, max: 5, requires: ['svartalfheim'], effects: [{ stat: 'globalPerRealm', op: 'add', v: 0.05 }] },
      { id: 't_roots', icon: 'branches', name: 'Deep Roots', desc: 'Blank Rune cap ×3', cost: { svartalfheim: 30, niflheim: 15 }, growth: 3, max: 4, requires: ['niflheim'], effects: [{ stat: 'capMult', op: 'mul', v: 3 }] },
      { id: 't_fireice', name: 'Roots of Fire and Ice', desc: 'Niflheim and Muspelheim yields ×1.5', cost: { niflheim: 10, muspelheim: 10 }, growth: 3, max: 3, requires: ['niflheim', 'muspelheim'], effects: [{ stat: 'yield_niflheim', op: 'mul', v: 1.5 }, { stat: 'yield_muspelheim', op: 'mul', v: 1.5 }] },
      { id: 't_mimir', name: "Mimir's Well", desc: 'Imbue cost ×0.85', cost: { niflheim: 20, jotunheim: 5 }, growth: 3, max: 3, requires: ['jotunheim'], effects: [{ stat: 'imbueCostMult', op: 'mul', v: 0.9 }] },
      { id: 't_nidhogg', icon: 'snake', name: "Nidhogg's Root", desc: 'Miners ×1.3, click power ×0.8', cost: { helheim: 100 }, growth: 3, max: 3, requires: ['helheim'], effects: [{ stat: 'minerMult', op: 'mul', v: 1.3 }, { stat: 'clickMult', op: 'mul', v: 0.8 }] },
      { id: 't_eagle', icon: 'eye', name: 'The Eagle and the Hawk', desc: 'Crit chance +5%, double imbue chance +5%', cost: { jotunheim: 20, alfheim: 5 }, growth: 3, max: 3, requires: ['alfheim'], effects: [{ stat: 'critChance', op: 'add', v: 0.05 }, { stat: 'doubleChance', op: 'add', v: 0.05 }] },
    ],

    // ---------------------------------------------------------------- permanent tree (Seeds)
    norns: {
      urd: { name: 'Urd', sub: 'The Past', desc: 'Bonuses from everything you have ever made.' },
      verdandi: { name: 'Verdandi', sub: 'The Present', desc: 'Bonuses to active play.' },
      skuld: { name: 'Skuld', sub: 'The Future', desc: 'Bonuses that pay off after Ragnarök.' },
      shop: { name: 'The Seed Shop', sub: 'Unlocks', desc: 'New options for future runs.' },
    },
    permUpgrades: [
      { id: 'urd_memory', icon: 'chart', branch: 'urd', name: 'Echoes of the Past', desc: 'Production +5% per digit of lifetime Blank Runes', base: 4, growth: 2, max: 5, effects: [{ stat: 'lifetimePerLog', op: 'add', v: 0.05 }] },
      { id: 'urd_cache', branch: 'urd', name: 'Ancestral Cache', desc: 'Start each run with +150 Blank Runes', base: 3, growth: 1.8, max: 5, effects: [{ stat: 'startBlank', op: 'add', v: 150 }] },
      { id: 'ver_click', branch: 'verdandi', name: 'Strong Arm', desc: 'Click power ×1.5', base: 2, growth: 2, max: 8, effects: [{ stat: 'clickMult', op: 'mul', v: 1.5 }] },
      { id: 'ver_streak', branch: 'verdandi', name: 'Battle Rhythm', desc: 'Click streak cap +25%', base: 3, growth: 2, max: 4, effects: [{ stat: 'streakMax', op: 'add', v: 0.25 }] },
      { id: 'ver_miner', branch: 'verdandi', name: 'Eternal Forgemaster', desc: 'Miners ×1.5', base: 3, growth: 2, max: 8, effects: [{ stat: 'minerMult', op: 'mul', v: 1.5 }] },
      { id: 'sk_seed', branch: 'skuld', name: 'Seeds of Tomorrow', desc: 'Seeds from Ragnarök ×1.15', base: 5, growth: 2, max: 5, effects: [{ stat: 'seedMult', op: 'mul', v: 1.15 }] },
      { id: 'sk_head', branch: 'skuld', name: 'Head Start', desc: 'Start each run with 3 free miners', base: 2, growth: 1.8, max: 5, effects: [{ stat: 'startMiners', op: 'add', v: 3 }] },
      { id: 'sk_sleep', icon: 'moon', branch: 'skuld', name: 'Long Sleep', desc: 'Offline cap +2h, offline rate +10%', base: 3, growth: 2, max: 5, effects: [{ stat: 'offlineCapH', op: 'add', v: 2 }, { stat: 'offlineRate', op: 'add', v: 0.1 }] },
      { id: 'shop_curses', icon: 'mask', branch: 'shop', name: "Whispers of Loki", desc: 'Curses can appear among boon choices', base: 3, growth: 1, max: 1, effects: [] },
      { id: 'shop_reroll', branch: 'shop', name: "Norn's Second Thread", desc: '+1 reroll per run', base: 5, growth: 2, max: 3, effects: [{ stat: 'rerolls', op: 'add', v: 1 }] },
      { id: 'shop_fates', icon: 'thread', branch: 'shop', name: 'Tapestry of Fates', desc: 'Four new fates join the pool', base: 6, growth: 1, max: 1, effects: [] },
      { id: 'shop_boons', icon: 'gift', branch: 'shop', name: 'Hidden Gifts', desc: 'Five wandering boons join the pool', base: 8, growth: 1, max: 1, effects: [] },
      { id: 'shop_auto', icon: 'gear', branch: 'shop', name: 'Auto-Imbue', desc: 'Imbue automatically by a ratio you set', base: 15, growth: 1, max: 1, effects: [] },
      { id: 'shop_tiers', icon: 'star', branch: 'shop', name: 'Deeper Favor', desc: 'Boons gain a fourth tier', base: 20, growth: 1, max: 1, effects: [] },
    ],

    // ---------------------------------------------------------------- fates
    fates: [
      { id: 'fimbulwinter', name: 'Fimbulwinter', desc: 'Niflheim yields ×2, Muspelheim ×0.5', effects: [{ stat: 'yield_niflheim', op: 'mul', v: 2 }, { stat: 'yield_muspelheim', op: 'mul', v: 0.5 }] },
      { id: 'surts_embers', name: "Surt's Embers", desc: 'Muspelheim yields ×2, Niflheim ×0.5', effects: [{ stat: 'yield_muspelheim', op: 'mul', v: 2 }, { stat: 'yield_niflheim', op: 'mul', v: 0.5 }] },
      { id: 'dwarven_union', name: 'Dwarven Union', desc: 'Miners 50% stronger, click power 25% weaker', effects: [{ stat: 'minerMult', op: 'mul', v: 1.5 }, { stat: 'clickMult', op: 'mul', v: 0.75 }] },
      { id: 'giants_appetite', name: "Giants' Appetite", desc: 'Jotunheim upgrades twice as strong, Jotunheim costs +50% to unlock', effects: [{ stat: 'upgradeScale_jotunheim', op: 'mul', v: 2 }, { stat: 'unlockCost_jotunheim', op: 'mul', v: 1.5 }] },
      { id: 'quiet_dead', name: 'Quiet Dead', desc: 'Helheim 40% cheaper to unlock, Alfheim 40% costlier', effects: [{ stat: 'unlockCost_helheim', op: 'mul', v: 0.6 }, { stat: 'unlockCost_alfheim', op: 'mul', v: 1.4 }] },
      { id: 'golden_age', name: 'Golden Age', desc: 'Asgard 40% cheaper, all other realms cost 10% more', effects: [{ stat: 'unlockCostMult', op: 'mul', v: 1.1 }, { stat: 'unlockCost_asgard', op: 'mul', v: 0.545 }] },
      { id: 'wanderers_road', name: "Wanderer's Road", desc: 'Start with a free tier of one random boon', pack: true, effects: [], special: 'freeBoon' },
      { id: 'heavy_hands', name: 'Heavy Hands', desc: 'Click power ×2, miners ×0.6', pack: true, effects: [{ stat: 'clickMult', op: 'mul', v: 2 }, { stat: 'minerMult', op: 'mul', v: 0.6 }] },
      { id: 'patient_roots', name: 'Patient Roots', desc: 'Offline progress ×2, active production ×0.8', pack: true, effects: [{ stat: 'offlineRate', op: 'mul', v: 2 }, { stat: 'globalMult', op: 'mul', v: 0.8 }] },
      { id: 'idle_hands', name: 'Idle Hands', desc: 'Miners ×2, click power ×0.5', pack: true, effects: [{ stat: 'minerMult', op: 'mul', v: 2 }, { stat: 'clickMult', op: 'mul', v: 0.5 }] },
    ],

    // ---------------------------------------------------------------- boons
    // realm: the realm whose unlock offers it ('any' = wandering boon from shop_boons).
    boons: [
      { id: 'dwarven_overtime', realm: 'svartalfheim', name: 'Dwarven Overtime', desc: 'Miners ×{t} for 60s after each click', fmt: 'plus1x', effects: [{ stat: 'overtime', op: 'add', t: [1, 1.5, 2, 2.5] }] },
      { id: 'deep_veins', realm: 'svartalfheim', name: 'Deep Veins', desc: 'Miners {t}', fmt: 'pct', effects: [{ stat: 'minerMult', op: 'mul', t: [1.2, 1.3, 1.4, 1.5] }] },
      { id: 'tinkerers_luck', realm: 'svartalfheim', name: "Tinkerer's Luck", desc: '{t} chance of a free extra miner on each hire', fmt: 'chance', effects: [{ stat: 'freeMinerChance', op: 'add', t: [0.15, 0.25, 0.35, 0.45] }] },

      { id: 'frostbank', realm: 'niflheim', name: 'Frostbank', desc: 'Blank Rune cap {t}', fmt: 'pct', effects: [{ stat: 'capMult', op: 'mul', t: [1.25, 1.5, 1.75, 2] }] },
      { id: 'cold_storage', realm: 'niflheim', name: 'Cold Storage', desc: 'Offline rate {t}', fmt: 'addpct', effects: [{ stat: 'offlineRate', op: 'add', t: [0.1, 0.15, 0.2, 0.25] }] },
      { id: 'rime_rune', realm: 'niflheim', name: 'Rime Rune', desc: 'Stored Blank Runes grow {t}/s', fmt: 'chance3', effects: [{ stat: 'interest', op: 'add', t: [0.0005, 0.00075, 0.001, 0.00125] }] },

      { id: 'bellows', realm: 'muspelheim', name: 'Bellows', desc: 'Imbue cost {t}', fmt: 'pct', effects: [{ stat: 'imbueCostMult', op: 'mul', t: [0.9, 0.85, 0.8, 0.75] }] },
      { id: 'ember_surge', realm: 'muspelheim', name: 'Ember Surge', desc: '{t} chance an imbue gives double', fmt: 'chance', effects: [{ stat: 'doubleChance', op: 'add', t: [0.05, 0.075, 0.1, 0.125] }] },
      { id: 'surtrs_favor', realm: 'muspelheim', name: "Surtr's Favor", desc: 'Muspelheim yields {t}', fmt: 'pct', effects: [{ stat: 'yield_muspelheim', op: 'mul', t: [1.2, 1.3, 1.4, 1.5] }] },

      { id: 'giants_stride', realm: 'jotunheim', name: "Giant's Stride", desc: 'All production {t}', fmt: 'pct', effects: [{ stat: 'globalMult', op: 'mul', t: [1.15, 1.25, 1.35, 1.45] }] },
      { id: 'boulder_toss', realm: 'jotunheim', name: 'Boulder Toss', desc: 'Click power {t}', fmt: 'pct', effects: [{ stat: 'clickMult', op: 'mul', t: [1.25, 1.4, 1.55, 1.7] }] },
      { id: 'hoard', realm: 'jotunheim', name: 'Hoard', desc: '+{t} Blank Runes/s per realm owned', fmt: 'num', effects: [{ stat: 'flatPerRealm', op: 'add', t: [20, 35, 50, 70] }] },

      { id: 'soul_harvest', realm: 'helheim', name: 'Soul Harvest', desc: 'Miners {t}', fmt: 'pct', effects: [{ stat: 'minerMult', op: 'mul', t: [1.2, 1.3, 1.4, 1.5] }] },
      { id: 'hels_patience', realm: 'helheim', name: "Hel's Patience", desc: 'Offline cap {t}', fmt: 'pct', effects: [{ stat: 'offlineCapMult', op: 'mul', t: [1.25, 1.5, 1.75, 2] }] },
      { id: 'deathless_toil', realm: 'helheim', name: 'Deathless Toil', desc: 'Miners +{t} per realm unlocked', fmt: 'addpct', effects: [{ stat: 'minerPerRealm', op: 'add', t: [0.03, 0.045, 0.06, 0.075] }] },

      { id: 'light_of_elves', realm: 'alfheim', name: 'Light of the Elves', desc: 'Alfheim yields {t}', fmt: 'pct', effects: [{ stat: 'yield_alfheim', op: 'mul', t: [1.2, 1.3, 1.4, 1.5] }] },
      { id: 'glimmer', realm: 'alfheim', name: 'Glimmer', desc: 'Crit chance +{t}', fmt: 'chance', effects: [{ stat: 'critChance', op: 'add', t: [0.05, 0.075, 0.1, 0.125] }] },
      { id: 'twin_spark', realm: 'alfheim', name: 'Twin Spark', desc: 'Double imbue chance +{t}', fmt: 'chance', effects: [{ stat: 'doubleChance', op: 'add', t: [0.05, 0.075, 0.1, 0.125] }] },

      { id: 'fertile_soil', realm: 'vanaheim', name: 'Fertile Soil', desc: 'Production grows +{t} per minute', fmt: 'chance', effects: [{ stat: 'growthPerMin', op: 'add', t: [0.01, 0.015, 0.02, 0.025] }] },
      { id: 'harvest_rite', realm: 'vanaheim', name: 'Harvest Rite', desc: 'Production +{t} per realm owned', fmt: 'chance', effects: [{ stat: 'globalPerRealm', op: 'add', t: [0.1, 0.15, 0.2, 0.25] }] },
      { id: 'freyrs_gift', realm: 'vanaheim', name: "Freyr's Gift", desc: 'Upgrade costs {t}', fmt: 'pct', effects: [{ stat: 'upgradeCostMult', op: 'mul', t: [0.9, 0.85, 0.8, 0.75] }] },

      { id: 'valhalla_feast', realm: 'asgard', name: 'Valhalla Feast', desc: 'All production {t}', fmt: 'pct', effects: [{ stat: 'globalMult', op: 'mul', t: [1.25, 1.4, 1.55, 1.7] }] },
      { id: 'odins_eye', realm: 'asgard', name: "Odin's Eye", desc: 'He gave an eye to see more threads. +{t} rerolls', fmt: 'num', effects: [{ stat: 'rerolls', op: 'add', t: [1, 2, 3, 4] }] },
      { id: 'thunders_toll', realm: 'asgard', name: "Thunder's Toll", desc: 'Crit power +{t}×', fmt: 'num', effects: [{ stat: 'critMult', op: 'add', t: [5, 7.5, 10, 12.5] }] },

      // Wandering boons (shop_boons)
      { id: 'mead_of_poetry', realm: 'any', name: 'Mead of Poetry', desc: 'Click streak cap +{t}', fmt: 'chance', effects: [{ stat: 'streakMax', op: 'add', t: [0.25, 0.4, 0.55, 0.7] }] },
      { id: 'sleipnirs_pace', realm: 'any', name: "Sleipnir's Pace", desc: 'All production {t}', fmt: 'pct', effects: [{ stat: 'globalMult', op: 'mul', t: [1.1, 1.2, 1.3, 1.4] }] },
      { id: 'gungnirs_aim', realm: 'any', name: "Gungnir's Aim", desc: 'Crit chance +{t}', fmt: 'chance', effects: [{ stat: 'critChance', op: 'add', t: [0.04, 0.06, 0.08, 0.1] }] },
      { id: 'brisingamen', realm: 'any', name: 'Brisingamen', desc: 'All imbue yields {t}', fmt: 'pct', effects: [{ stat: 'yieldMult', op: 'mul', t: [1.1, 1.15, 1.2, 1.25] }] },
      { id: 'draupnir', realm: 'any', name: 'Draupnir', desc: '+{t} auto-miners (the ring that multiplies)', fmt: 'num', effects: [{ stat: 'miners', op: 'add', t: [9, 18, 27, 36] }] },
    ],

    // ---------------------------------------------------------------- curses
    curses: [
      { id: 'lokis_bargain', name: "Loki's Bargain", desc: 'Muspelheim yields ×2, but imbuing costs 25% more', seedMult: 1.1, effects: [{ stat: 'yield_muspelheim', op: 'mul', v: 2 }, { stat: 'imbueCostMult', op: 'mul', v: 1.25 }] },
      { id: 'nidhoggs_gnaw', name: "Nidhogg's Gnaw", desc: 'Miners ×3, click power halved', seedMult: 1.1, effects: [{ stat: 'minerMult', op: 'mul', v: 3 }, { stat: 'clickMult', op: 'mul', v: 0.5 }] },
      { id: 'fenrirs_chain', name: "Fenrir's Chain", desc: 'All production ×2, but reach Asgard within 25 minutes or Ragnarök comes early', seedMult: 1.5, timer: 25 * 60, failText: 'Fenrir broke free.', effects: [{ stat: 'globalMult', op: 'mul', v: 2 }] },
      { id: 'wolf_at_door', name: 'Wolf at the Door', desc: 'Realm unlocks cost half, but reach Asgard within 20 minutes', seedMult: 1.4, timer: 20 * 60, failText: 'The wolf came in.', effects: [{ stat: 'unlockCostMult', op: 'mul', v: 0.5 }] },
      { id: 'hels_debt', name: "Hel's Debt", desc: 'Helheim boons twice as strong, but 20% of production is paid as tribute', seedMult: 1.15, effects: [{ stat: 'boonScale_helheim', op: 'mul', v: 2 }, { stat: 'tribute', op: 'add', v: 0.2 }] },
      { id: 'hubris', name: 'Hubris', desc: 'Asgard yields ×3.3, all other yields ×0.9', seedMult: 1.2, effects: [{ stat: 'yieldMult', op: 'mul', v: 0.9 }, { stat: 'yield_asgard', op: 'mul', v: 3.3 }] },
    ],
  };

  root.RC = root.RC || {};
  root.RC.DATA = DATA;
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
