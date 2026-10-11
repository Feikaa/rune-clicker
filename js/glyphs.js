/*
 * Rune glyphs drawn in code as SVG strokes on a 100x100 grid.
 * Each realm uses an Elder Futhark rune; all are recolourable via currentColor.
 */
(function (root) {
  'use strict';

  const PATHS = {
    blank: '',
    mannaz: 'M32 14 L32 86 M68 14 L68 86 M32 14 L68 44 M68 14 L32 44',
    uruz: 'M32 86 L32 14 L68 36 L68 86',
    isa: 'M50 12 L50 88',
    kenaz: 'M66 18 L34 50 L66 82',
    thurisaz: 'M36 12 L36 88 M36 30 L64 50 L36 70',
    hagalaz: 'M32 12 L32 88 M68 12 L68 88 M32 38 L68 62',
    sowilo: 'M62 12 L36 44 L64 56 L38 88',
    jera: 'M46 18 L28 38 L46 58 M54 42 L72 62 L54 82',
    ansuz: 'M36 12 L36 88 M36 14 L64 32 M36 38 L64 56',
  };

  // Stone silhouette behind the big clickable rune.
  const STONE = 'M50 4 C74 4 90 16 92 40 C94 64 86 88 60 96 C44 100 22 96 12 80 C4 64 6 30 18 16 C26 8 38 4 50 4 Z';


  // Upgrade icons on a 24x24 grid. Picked by the upgrade's `icon` field, or by
  // the stat of its first effect.
  const ICONS = {
    chisel: 'M14 4l6 6-9 9-6-6z M5 13l-2 8 8-2',
    hammer: 'M9 7l4-4 8 8-4 4z M11 9l-8 8 3 3 8-8',
    rhythm: 'M3 12h4l2-6 3 12 3-9 2 3h4',
    chest: 'M4 10h16v9H4z M4 10l2-5h12l2 5 M11 13h2v2h-2z',
    sun: 'M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
    dwarf: 'M7 10a5 5 0 0 1 10 0z M5 10h14 M8 10v3c0 4 2 7 4 7s4-3 4-7v-3 M10 14h4',
    cart: 'M3 7h18l-3 9H6z M6.5 19.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0 M14.5 19.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0',
    pick: 'M4 21l10-10 M8 6c3-3 9-3 12 1-3-1-7 0-10 3z',
    link: 'M10 14a4 4 0 0 1 0-6l2-2a4 4 0 0 1 6 6l-1 1 M14 10a4 4 0 0 1 0 6l-2 2a4 4 0 0 1-6-6l1-1',
    moon: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z',
    hourglass: 'M6 3h12M6 21h12M7 3c0 6 10 6 10 9s-10 3-10 9M17 3c0 6-10 6-10 9s10 3 10 9',
    drop: 'M12 3c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12z',
    flame: 'M12 21a6 6 0 0 0 6-6c0-5-4-7-6-12-1 4-3 5-3 8-1-1-2-2-2-4-1 2-1 5-1 8a6 6 0 0 0 6 6z',
    crystal: 'M12 2l7 7-7 13-7-13z M5 9h14 M9 9l3 13 3-13',
    boulder: 'M4 17c-1-6 3-11 8-11s9 4 8 10c-1 3-14 4-16 1z M9 11l2 2',
    branches: 'M12 22V8 M12 15l-6-6 M12 12l6-6 M6 9V5 M18 6V3',
    eye: 'M2 12c4-7 16-7 20 0-4 7-16 7-20 0z M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
    bolt: 'M13 2L4 14h7l-1 8 10-13h-7z',
    twin: 'M7 4l5 6-5 10-5-10z M17 4l5 6-5 10-5-10z',
    sprout: 'M12 21V11 M12 11C12 6 7 4 4 5c0 4 3 6 8 6 M12 14c0-4 4-6 8-5 0 3-3 5-8 5',
    chart: 'M4 20V14 M10 20V10 M16 20V5 M3 20h18',
    coin: 'M5 12a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M10 9h4l-4 6h4',
    seed: 'M12 3c5 4 7 9 4 14-2 3-6 3-8 0-3-5-1-10 4-14z M12 8v9',
    thread: 'M5 19L19 5 M8 20c0-6 3-9 9-9 M4 14c2-5 5-7 9-7',
    skull: 'M5 11a7 7 0 1 1 14 0v3l-2 1v4H7v-4l-2-1z M8 11h2 M14 11h2 M10 19v-2M14 19v-2',
    boat: 'M3 14h18l-3 5H6z M12 3v11 M12 4l6 7h-6',
    rainbow: 'M3 18a9 9 0 0 1 18 0 M6 18a6 6 0 0 1 12 0 M9 18a3 3 0 0 1 6 0',
    snake: 'M4 18c4 0 4-4 8-4s4 4 8 4 M4 11c4 0 4-4 8-4s4 4 8 4 M20 7l1-2',
    gift: 'M4 10h16v10H4z M3 7h18v3H3z M12 7v13 M12 7c-2-4-6-4-5 0 M12 7c2-4 6-4 5 0',
    gear: 'M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3',
    star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
    leaf: 'M5 19c0-9 6-14 14-14 0 8-5 14-14 14z M5 19l8-8',
    mask: 'M4 6c5-2 11-2 16 0 0 8-3 13-8 13S4 14 4 6z M8 10h3 M13 10h3 M9 15c2 1 4 1 6 0',
  };

  const STAT_ICON = {
    clickFlat: 'chisel', clickMult: 'hammer', streakMax: 'rhythm', capMult: 'chest', globalMult: 'sun',
    miners: 'dwarf', startMiners: 'dwarf', minerBase: 'cart', minerMult: 'pick', clickFromMiners: 'link',
    offlineRate: 'moon', offlineCapH: 'hourglass', interest: 'drop', imbueCostMult: 'flame', yieldMult: 'crystal',
    flatRate: 'boulder', minerPerRealm: 'branches', globalPerRealm: 'branches', critChance: 'eye', critMult: 'bolt',
    minerCrit: 'bolt', doubleChance: 'twin', growthPerMin: 'sprout', globalPerLogRunes: 'chart', lifetimePerLog: 'chart',
    upgradeCostMult: 'coin', seedMult: 'seed', seedFlat: 'seed', startBlank: 'chest', rerolls: 'thread',
  };

  function iconName(u) {
    if (u.icon) return u.icon;
    const e = u.effects && u.effects[0];
    if (!e) return 'star';
    if (/^yield_/.test(e.stat)) return 'crystal';
    return STAT_ICON[e.stat] || 'star';
  }

  // Frame tier: 0 unbought (stone), 1 bronze, 2 silver, 3 gold, 4 maxed (radiant).
  function iconTier(level, max) {
    if (!level) return 0;
    if (level >= max) return 4;
    return 1 + Math.min(2, Math.floor((level / max) * 3));
  }

  function upgradeIcon(u, level, max) {
    const tier = iconTier(level, max);
    return `<span class="uicon t${tier}" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22">`
      + `<path d="${ICONS[iconName(u)]}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  }

  function glyph(name, opts) {
    opts = opts || {};
    const size = opts.size || 24;
    const sw = opts.stroke || 9;
    const cls = opts.cls ? ` class="${opts.cls}"` : '';
    const p = PATHS[name] || '';
    return `<svg${cls} viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">`
      + (p ? `<path d="${p}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<circle cx="50" cy="50" r="14" fill="none" stroke="currentColor" stroke-width="${sw * 0.8}" opacity="0.7"/>`)
      + '</svg>';
  }

  function stone(name) {
    const p = PATHS[name] || '';
    return `<svg class="stone-svg" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id="stoneGrad" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stop-color="var(--stone-hi)"/>
          <stop offset="100%" stop-color="var(--stone-lo)"/>
        </radialGradient>
      </defs>
      <path d="${STONE}" fill="url(#stoneGrad)" stroke="var(--stone-edge)" stroke-width="1.5"/>
      ${p ? `<path class="stone-glyph" d="${p}" transform="translate(20 20) scale(0.6)" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<path d="${STONE}" transform="translate(50 50) scale(0.8) translate(-50 -50)" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>
           <path d="M30 26 C40 20 56 18 66 24" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="3" stroke-linecap="round"/>`}
    </svg>`;
  }

  root.RC = root.RC || {};
  root.RC.Glyphs = { glyph, stone, upgradeIcon, iconName, iconTier, PATHS, ICONS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
