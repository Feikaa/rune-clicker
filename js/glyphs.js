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
        : '<path class="stone-glyph faint" d="M38 30 L62 70 M62 30 L38 70" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.35"/>'}
    </svg>`;
  }

  root.RC = root.RC || {};
  root.RC.Glyphs = { glyph, stone, PATHS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
