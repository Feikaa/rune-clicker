/*
 * Rendering. Panels are rebuilt only when their structure changes (levels,
 * unlocks, tab...). Numbers and affordability are refreshed every frame via
 * data-val / data-afford attributes, so buttons are never swapped mid-click.
 */
(function (root) {
  'use strict';

  const Game = root.RC.Game;
  const G = root.RC.Glyphs;
  const D = () => root.RC.DATA;
  const $ = (sel) => document.querySelector(sel);

  // ------------------------------------------------------------------ formatting
  const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  // Whole numbers only. Amounts you hold round down, so the number shown is
  // never more than you can actually spend.
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + fmt(-n);
    if (n < 1000) return String(Math.floor(n + 1e-9));
    const e = Math.floor(Math.log10(n) / 3);
    if (e < SUFFIX.length) {
      const v = n / Math.pow(1000, e);
      return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v)) + SUFFIX[e];
    }
    return n.toExponential(2).replace('+', '');
  }

  // Rates and per-click amounts round to the nearest whole number.
  function fmtRound(n) {
    if (n > 0 && n < 0.5) return '<1';
    return fmt(n < 1000 ? Math.round(n) : n);
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const ss = String(s).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
  }

  function fmtDuration(sec) {
    if (sec < 60) return `${Math.floor(sec)}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m`;
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  const pct = (x) => `${Math.round(x * 1000) / 10}%`;
  function boonValue(b, tier) {
    const t = b.effects[0].t[tier - 1];
    switch (b.fmt) {
      case 'pct': return (t >= 1 ? '+' : '−') + pct(Math.abs(t - 1));
      case 'plus1x': return `×${1 + t}`;
      case 'addpct': return '+' + pct(t);
      case 'chance': return pct(t);
      case 'chance3': return `${Math.round(t * 100000) / 1000}%`;
      default: return String(t);
    }
  }
  function boonDesc(b, tier) { return b.desc.replace('{t}', boonValue(b, tier)); }

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const realm = (id) => D().realms[id];
  const rglyph = (id, size, cls) => G.glyph(realm(id).glyph, { size, cls });

  // ------------------------------------------------------------------ UI state
  const ui = { tab: 'realms', realm: 'midgard', keys: {}, seenTabs: {} };

  function tabsAvailable(s) {
    const t = [['realms', 'Realms']];
    if (Game.has(s.run, 'svartalfheim')) t.push(['tree', 'World Tree']);
    if (s.meta.ragnaroks > 0 || s.meta.seeds > 0) t.push(['seeds', 'Seeds']);
    t.push(['settings', '⚙']);
    return t;
  }

  // ------------------------------------------------------------------ panels
  function renderTabs(s) {
    const tabs = tabsAvailable(s);
    if (!tabs.find((t) => t[0] === ui.tab)) ui.tab = 'realms';
    return tabs.map(([id, label]) => {
      const fresh = !ui.seenTabs[id] && id !== 'realms' && id !== 'settings';
      return `<button class="tab${ui.tab === id ? ' active' : ''}${fresh ? ' new' : ''}" role="tab" data-act="tab:${id}" aria-label="${id === 'settings' ? 'Settings' : label}">${label}</button>`;
    }).join('');
  }

  const costSpans = (cost) => Object.keys(cost).map((c) => `<span style="--rc:${realm(c).color}">${rglyph(c, 14)}${fmt(cost[c])}</span>`).join('');
  const lvlLabel = (lvl, max) => (max === 1 ? (lvl ? 'owned' : '') : `${lvl}/${max}`);

  function upgradeItem(s, u, st) {
    const lvl = s.run.upgrades[u.id] || 0;
    const maxed = lvl >= u.max;
    return `<li><button class="item${maxed ? ' maxed' : ''}" style="--rc:${realm(u.realm).color}" data-act="buy:${u.id}" ${maxed ? '' : `data-afford="up:${u.id}"`}>
      ${G.upgradeIcon(u, lvl, u.max)}
      <span class="name">${esc(u.name)}<span class="lvl">${lvlLabel(lvl, u.max)}</span></span>
      <span class="cost">${maxed ? 'MAX' : costSpans(Game.upgradeCost(s, u.id, st))}</span>
      <span class="desc">${esc(u.desc)}</span>
    </button></li>`;
  }

  function realmPanel(s, id, st) {
    const r = realm(id);
    const cost = Game.imbueCost(s, id, st);
    const yld = Game.imbueYield(s, id, st);
    const autoOn = Game.permLevel(s.meta, 'shop_auto') > 0;
    const w = s.run.autoWeights[id] || 0;
    const btn = (n, label) => `<button class="btn realm" data-act="imbue:${id}:${n}" data-afford="imbue:${id}:${n}">${label}</button>`;
    return `<div class="card realm-card" style="--rc:${r.color}">
      <div class="realm-head">${rglyph(id, 44)}
        <div class="meta"><h2>${r.name}</h2><p>${esc(r.theme)} · ${esc(r.job)}</p></div>
        <div class="realm-count"><b data-val="rune:${id}">0</b><small>${r.rune} runes</small></div>
      </div>
      <div class="imbue">
        <div class="imbue-info">Imbue: <b>${fmt(Math.ceil(cost - 1e-9))}</b> Blank Runes → <b>1</b> ${r.rune}${Math.abs(yld - 1) > 0.005 ? ` · ${yld > 1 ? '+' : '−'}${pct(Math.abs(yld - 1))} yield` : ''}${st.doubleChance > 0 ? ` · ${pct(Math.min(1, st.doubleChance))} double` : ''}</div>
        <div class="btn-row">${btn(1, '×1')}${btn(10, '×10')}${btn(100, '×100')}${btn('max', 'Max <span class="max-n" data-val="imbueMax:' + id + '"></span>')}</div>
        ${autoOn ? `<div class="auto-row">Auto-imbue share <button class="btn" data-act="auto:${id}:-1" aria-label="Lower auto-imbue share">−</button><b>${w}</b><button class="btn" data-act="auto:${id}:1" aria-label="Raise auto-imbue share">+</button><span>${w ? '' : 'off'}</span></div>` : ''}
      </div>
      ${st.clickOnly && id === 'svartalfheim' ? `<p class="fate-note">Ymir's Hands: your miners don't dig. Each one adds ${Math.round(st.minerToClick * 100)}% of its output to every click instead.</p>` : ''}
      <ul class="list">${D().upgrades.filter((u) => u.realm === id).map((u) => upgradeItem(s, u, st)).join('')}</ul>
    </div>`;
  }

  function unlockCard(s, st) {
    const next = Game.nextRealm(s);
    if (!next) return '';
    const r = realm(next);
    const cost = Game.unlockCost(s, next, st);
    return `<div class="card unlock-card" style="--rc:${r.color}">
      <div class="realm-head">${rglyph(next, 36)}<div class="meta"><h2>${r.name}</h2><p>${esc(r.theme)} · ${esc(r.job)}</p></div></div>
      <div class="costs">${Object.keys(cost).map((c) => `<span class="cost-pill" style="--c:${realm(c).color}" data-pill="${c}:${cost[c]}">${rglyph(c, 14)}<span data-val="rune:${c}">0</span> / ${fmt(cost[c])}</span>`).join('')}</div>
      <div class="btn-row"><button class="btn" data-act="imbueMissing" data-afford="missing">Imbue what's missing</button><button class="btn primary" data-act="unlock" data-afford="unlock">Unlock ${r.name}</button></div>
    </div>`;
  }

  function ragnarokCard(s) {
    if (!Game.ragnarokReady(s)) return '';
    return `<div class="card ragnarok-card">
      <h2>Ragnarök</h2>
      <p>Asgard is yours. The wolf strains at its chain. End this world and plant the seeds of the next.</p>
      <p>Seeds if you end it now: <b class="seed-pill" data-val="seedEstimate">0</b></p>
      <button class="btn danger" data-act="ragnarok">Bring on Ragnarök</button>
    </div>`;
  }

  function realmsTab(s, st) {
    if (!Game.has(s.run, ui.realm)) ui.realm = s.run.unlocked[s.run.unlocked.length - 1];
    const chips = s.run.unlocked.map((id) => `<button class="chip${ui.realm === id ? ' active' : ''}" style="--rc:${realm(id).color}" data-act="realm:${id}">${rglyph(id, 16)}<span data-val="rune:${id}">0</span></button>`).join('');
    return ragnarokCard(s) + `<div class="chips">${chips}</div>` + realmPanel(s, ui.realm, st) + unlockCard(s, st);
  }

  // World Tree map: Asgard at the crown, Helheim at the roots.
  const NODES = {
    asgard: [150, 42], alfheim: [64, 92], vanaheim: [236, 92],
    svartalfheim: [56, 196], midgard: [150, 186], jotunheim: [244, 196],
    niflheim: [66, 300], muspelheim: [234, 300], helheim: [150, 336],
  };

  function treeMap(s) {
    const next = Game.nextRealm(s);
    const nodes = D().realmOrder.map((id) => {
      const [x, y] = NODES[id];
      const on = Game.has(s.run, id);
      const cls = ['tree-node', on ? 'on' : '', id === next ? 'next' : '', on && ui.realm === id ? 'selected' : ''].join(' ');
      return `<g class="${cls}" style="--c:${realm(id).color}" ${on ? `data-act="goto:${id}"` : ''} role="${on ? 'button' : 'img'}" aria-label="${realm(id).name}${on ? '' : ' (locked)'}">
        <circle class="ring" cx="${x}" cy="${y}" r="22"/>
        <g class="g" transform="translate(${x - 13} ${y - 13})">${G.glyph(realm(id).glyph, { size: 26, stroke: 10 })}</g>
        <text x="${x}" y="${y + 36}">${on || id === next ? realm(id).name : '?'}</text>
      </g>`;
    }).join('');
    return `<svg class="tree-map" viewBox="0 0 300 380" role="group" aria-label="Yggdrasil">
      <defs><linearGradient id="bark" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#4a3a28"/><stop offset="1" stop-color="#2b2219"/></linearGradient></defs>
      <g fill="none" stroke-linecap="round">
        <path d="M150 360 C146 300 156 240 150 186 C146 140 154 90 150 42" stroke="url(#bark)" stroke-width="18"/>
        <path d="M150 120 C120 110 90 104 64 92 M150 120 C180 110 210 104 236 92" stroke="#3d3022" stroke-width="9"/>
        <path d="M150 210 C120 206 84 202 56 196 M150 210 C180 206 216 202 244 196" stroke="#3d3022" stroke-width="8"/>
        <path d="M150 320 C120 316 92 310 66 300 M150 320 C180 316 208 310 234 300" stroke="#33281d" stroke-width="7"/>
        <path d="M60 60 C100 0 200 0 240 60 C280 110 220 140 150 130 C80 140 20 110 60 60 Z" fill="#7fd6a80d" stroke="#7fd6a826" stroke-width="1.5"/>
      </g>
      ${nodes}
    </svg>`;
  }

  function treeItem(s, u, st) {
    const lvl = s.run.tree[u.id] || 0;
    const avail = Game.treeAvailable(s, u.id);
    const maxed = lvl >= u.max;
    const cost = Game.treeCost(s, u.id, st);
    const costHtml = maxed ? 'MAX' : avail ? costSpans(cost)
      : `<span class="muted">needs ${u.requires.map((r) => realm(r).name).join(', ')}</span>`;
    return `<li><button class="item${maxed ? ' maxed' : ''}${avail ? '' : ' off'}" style="--rc:#7fd6a8" data-act="tree:${u.id}" ${avail && !maxed ? `data-afford="tree:${u.id}"` : ''}>
      ${G.upgradeIcon(u, lvl, u.max)}
      <span class="name">${esc(u.name)}<span class="lvl">${lvlLabel(lvl, u.max)}</span></span>
      <span class="cost">${costHtml}</span>
      <span class="desc">${esc(u.desc)}</span>
    </button></li>`;
  }

  function treeTab(s, st) {
    return `<div class="card">${treeMap(s)}<p class="muted center">Tap a glowing realm to open it.</p></div>
      <div class="section-title">Branches · reset by Ragnarök</div>
      <ul class="list">${D().treeUpgrades.map((u) => treeItem(s, u, st)).join('')}</ul>`;
  }

  function permItem(s, u) {
    const lvl = Game.permLevel(s.meta, u.id);
    const maxed = lvl >= u.max;
    return `<li><button class="item${maxed ? ' maxed' : ''}" style="--rc:#7fd6a8" data-act="perm:${u.id}" ${maxed ? '' : `data-afford="perm:${u.id}"`}>
      ${G.upgradeIcon(u, lvl, u.max)}
      <span class="name">${esc(u.name)}<span class="lvl">${lvlLabel(lvl, u.max)}</span></span>
      <span class="cost">${maxed ? 'MAX' : `<span class="seed-pill">${fmt(Game.permCost(s, u.id))}</span>`}</span>
      <span class="desc">${esc(u.desc)}</span>
    </button></li>`;
  }

  function seedsTab(s) {
    const N = D().norns;
    const cols = ['shop', 'urd', 'verdandi', 'skuld'].map((b) => `<div class="card norn">
      <h3>${N[b].name}</h3><p class="sub">${N[b].sub} · ${N[b].desc}</p>
      <ul class="list">${D().permUpgrades.filter((u) => u.branch === b).map((u) => permItem(s, u)).join('')}</ul>
    </div>`).join('');
    return `<p class="muted">Yggdrasil Seeds survive Ragnarök. What you plant here stays planted.</p><div class="norns">${cols}</div>`;
  }

  function settingsTab(s) {
    const m = s.meta;
    const hist = m.history.slice().reverse().slice(0, 8).map((h) => `<span>${h.failed ? 'Failed' : 'Ragnarök'}${h.fate ? ' · ' + esc(Game.lookup().fates[h.fate].name) : ''}</span><span>${fmtTime(h.time)} · ${h.seeds} seeds</span>`).join('');
    return `<div class="card">
      <h3>Saga</h3>
      <div class="stats" style="margin-top:10px">
        <span>Ragnaröks</span><span>${m.ragnaroks}</span>
        <span>Seeds earned</span><span>${fmt(m.totalSeeds)}</span>
        <span>Fastest Ragnarök</span><span>${m.bestTime === null ? '—' : fmtTime(m.bestTime)}</span>
        <span>Blank Runes ever mined</span><span data-val="lifetime">0</span>
        <span>Clicks this run</span><span data-val="clicks">0</span>
        ${hist}
      </div>
    </div>
    <div class="card">
      <h3>Save</h3>
      <p class="muted">The game saves itself every few seconds in this browser.</p>
      <div class="btn-row"><button class="btn" data-act="save">Save now</button><button class="btn" data-act="export">Export</button><button class="btn" data-act="import">Import</button></div>
      <div class="btn-row" style="margin-top:8px"><button class="btn danger" data-act="reset">Erase everything</button></div>
    </div>
    <div class="card"><h3>How to play</h3>
      <p class="muted" style="margin-top:8px">Click the stone to mine Blank Runes. Imbue them in a realm to make that realm's runes, spend runes on upgrades, and gather the mix of runes each new realm demands. Reach Asgard to unleash Ragnarök and earn Yggdrasil Seeds that carry over. Space bar also mines.</p>
    </div>`;
  }

  // ------------------------------------------------------------------ banners
  function bannersHtml(s) {
    const run = s.run, I = Game.lookup();
    const out = [];
    if (run.blessing) out.push(`<span class="banner blessing" data-act="info:blessing">ᚨ ${D().blessing.name}</span>`);
    if (run.fate) out.push(`<span class="banner fate" data-act="info:run">Fate: ${esc(I.fates[run.fate].name)}</span>`);
    run.curses.forEach((c) => out.push(`<span class="banner curse" data-act="info:run">${esc(I.curses[c].name)}</span>`));
    if (run.timer) out.push(`<span class="banner curse timer" data-val="timer" data-act="info:run">0:00</span>`);
    const nb = Object.keys(run.boons).length;
    if (nb) out.push(`<span class="banner boons" data-act="info:run">${nb} boon${nb > 1 ? 's' : ''}</span>`);
    return out.join('');
  }

  // ------------------------------------------------------------------ render
  function structureKey(s) {
    const r = s.run;
    return JSON.stringify([ui.tab, ui.realm, r.unlocked, r.upgrades, r.tree, r.boons, r.fate, r.curses, !!r.timer, r.blessing,
      s.meta.perm, s.meta.ragnaroks, s.meta.seeds > 0, r.autoWeights, s.meta.history.length]);
  }

  function setHtml(el, key, html) {
    if (ui.keys[el.id] === key) return;
    ui.keys[el.id] = key;
    el.innerHTML = html;
  }

  function render(s, force) {
    if (force) ui.keys = {};
    const key = structureKey(s);
    if (ui.keys.__all === key) return;
    ui.keys.__all = key;
    const st = Game.stats(s);
    setHtml($('#tabs'), key, renderTabs(s));
    setHtml($('#banners'), key, bannersHtml(s));
    ['realms', 'tree', 'seeds', 'settings'].forEach((t) => $('#tab-' + t).classList.toggle('hidden', t !== ui.tab));
    ui.seenTabs[ui.tab] = true;
    const body = $('#tab-' + ui.tab);
    const html = ui.tab === 'realms' ? realmsTab(s, st) : ui.tab === 'tree' ? treeTab(s, st) : ui.tab === 'seeds' ? seedsTab(s) : settingsTab(s);
    setHtml(body, key, html);
    $('#seedsBox').classList.toggle('hidden', !(s.meta.ragnaroks > 0 || s.meta.seeds > 0));
    refresh(s, st);
  }

  function affordable(s, spec, st) {
    const [kind, a] = spec.split(':');
    switch (kind) {
      case 'up': return Game.canAfford(s.run, Game.upgradeCost(s, a, st));
      case 'missing': return !Game.canUnlock(s) && s.run.blank >= 1;
      case 'tree': return Game.canAfford(s.run, Game.treeCost(s, a, st));
      case 'perm': return s.meta.seeds >= Game.permCost(s, a);
      case 'unlock': return Game.canUnlock(s);
      case 'imbue': return Game.maxImbuable(s, a, st) >= 1;
      default: return true;
    }
  }

  function value(s, spec, st) {
    const [kind, a] = spec.split(':');
    const run = s.run;
    switch (kind) {
      case 'blank': return fmt(run.blank);
      case 'cap': return fmt(Game.cap(s, st));
      case 'rate': return fmtRound(Game.productionRate(s, st));
      case 'seeds': return fmt(s.meta.seeds);
      case 'click': return '+' + fmtRound(Game.clickValue(s, st));
      case 'streak': { const b = Game.streakBonus(s, st); return b > 0.005 ? `streak +${Math.round(b * 100)}%` : ''; }
      case 'rune': return fmt(run.runes[a]);
      case 'imbueMax': { const n = Game.maxImbuable(s, a, st); return n ? `(${fmt(n * Game.imbueYield(s, a, st))})` : ''; }
      case 'clock': return fmtTime(run.activeTime);
      case 'target': {
        if (run.blessing) return 'Run 1';
        const t = Game.nextSpeedTarget(s);
        return t ? `${t.name} in ${fmtTime(t.max - run.activeTime)}` : 'Slow';
      }
      case 'timer': {
        const left = run.timer ? run.timer.endsAt - run.activeTime : 0;
        return `⏳ ${fmtTime(left)}`;
      }
      case 'seedEstimate': return fmt(Game.seedReward(s).total);
      case 'lifetime': return fmt(s.meta.lifetimeBlank);
      case 'clicks': return fmt(run.clicks);
      default: return '';
    }
  }

  // Cheap per-frame update of numbers and button states.
  function refresh(s, st) {
    st = st || Game.stats(s);
    document.querySelectorAll('[data-val]').forEach((el) => {
      const v = value(s, el.dataset.val, st);
      if (el.textContent !== v) el.textContent = v;
    });
    document.querySelectorAll('[data-afford]').forEach((el) => {
      el.classList.toggle('off', !affordable(s, el.dataset.afford, st));
    });
    document.querySelectorAll('[data-pill]').forEach((el) => {
      const [c, n] = el.dataset.pill.split(':');
      el.classList.toggle('ok', s.run.runes[c] >= Number(n) - 1e-9);
    });
    const capEl = document.querySelector('.res-main .cap');
    if (capEl) capEl.classList.toggle('full', s.run.blank >= Game.cap(s, st) * 0.999);
    const timer = document.querySelector('[data-val="timer"]');
    if (timer && s.run.timer) timer.classList.toggle('urgent', s.run.timer.endsAt - s.run.activeTime < 120);
  }

  // ------------------------------------------------------------------ rune stone
  function renderStone(s) {
    // The stone you mine is always an uncarved Blank Rune.
    if (ui.keys.stone) return;
    ui.keys.stone = true;
    const btn = $('#rune');
    btn.innerHTML = G.stone('blank');
    $('#blankIcon').innerHTML = G.glyph('blank', { size: 20 });
  }

  function floater(text, cls, x, y) {
    const box = $('#floaters');
    const el = document.createElement('div');
    el.className = 'floater ' + (cls || '');
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    box.appendChild(el);
    setTimeout(() => el.remove(), 900);
    while (box.children.length > 24) box.firstChild.remove();
  }

  // ------------------------------------------------------------------ modal & toasts
  function openModal(html, narrow) {
    $('#modalBox').className = 'modal-box' + (narrow ? ' narrow' : '');
    $('#modalBox').innerHTML = html;
    $('#modal').classList.remove('hidden');
    const focusable = $('#modalBox').querySelector('button');
    if (focusable) focusable.focus({ preventScroll: true });
  }
  function closeModal() { $('#modal').classList.add('hidden'); $('#modalBox').innerHTML = ''; }
  const modalOpen = () => !$('#modal').classList.contains('hidden');

  function toast(html, color, ms) {
    const el = document.createElement('div');
    el.className = 'toast';
    if (color) el.style.setProperty('--rc', color);
    el.innerHTML = html;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, ms || 4500);
  }

  function discoverToast(key) {
    if (key === 'blank') return;
    const r = realm(key);
    toast(`${rglyph(key, 36)}<div><b>${r.rune}</b> rune discovered<p>${esc(r.discovery)}</p></div>`, r.color, 6000);
  }

  // ------------------------------------------------------------------ modal content
  function choiceModal(s) {
    const p = s.run.pending, I = Game.lookup();
    let cards, title, lead;
    if (p.type === 'fate') {
      title = 'The Norns Weave';
      lead = 'Three threads. Choose one to bind this run.';
      cards = p.options.map((id, i) => {
        const f = I.fates[id];
        return `<button class="choice-card" style="--rc:#c6d6ff" data-act="choose:${i}"><span class="kind">Fate</span><h3>${esc(f.name)}</h3><span class="d">${esc(f.desc)}</span></button>`;
      });
    } else {
      const r = realm(p.realm);
      title = `${r.name} Offers a Gift`;
      lead = 'Choose one. Picking a boon you already hold makes it stronger.';
      cards = p.options.map((o, i) => {
        if (o.kind === 'curse') {
          const c = I.curses[o.id];
          return `<button class="choice-card curse" data-act="choose:${i}"><span class="kind">Curse</span><h3>${esc(c.name)}</h3><span class="d">${esc(c.desc)}</span>
            <span class="tags"><span class="tag reward">Seeds ×${c.seedMult}</span>${c.timer ? '<span class="tag risk">Can fail</span>' : ''}</span></button>`;
        }
        const b = I.boons[o.id];
        const cur = s.run.boons[o.id] || 0;
        const col = b.realm === 'any' ? '#c6a7ff' : realm(b.realm).color;
        const g = b.realm === 'any' ? G.glyph('blank', { size: 34 }) : rglyph(b.realm, 34);
        return `<button class="choice-card" style="--rc:${col}" data-act="choose:${i}">${g}<span class="kind">Boon</span><h3>${esc(b.name)}</h3>
          <span class="d">${esc(boonDesc(b, cur + 1))}</span><span class="tier">${cur ? `Tier ${cur} → ${cur + 1}` : 'New'}</span></button>`;
      });
    }
    const reroll = s.run.rerolls > 0 ? `<button class="btn" data-act="reroll">Reroll (${s.run.rerolls})</button>` : '';
    return `<h2>${title}</h2><p class="lead">${lead}</p><div class="choice-cards">${cards.join('')}</div><div class="actions">${reroll}</div><p class="muted center" style="margin-top:12px;font-size:12px">The run clock is paused while you choose.</p>`;
  }

  function rewardTable(r) {
    if (r.firstRun) {
      return `<div class="reward-table"><span>First Ragnarök</span><span>${r.total}</span>
        <span class="total">Yggdrasil Seeds</span><span class="total">${r.total}</span></div>
        <p class="muted center" style="margin-top:10px;font-size:13px">Your first Ragnarök pays a fixed gift. From now on Seeds grow with the runes you mine, your speed and the risks you take.</p>`;
    }
    return `<div class="reward-table">
      <span>Reaching Asgard</span><span>${r.base}</span>
      <span>Runes mined</span><span>+${r.runes}</span>
      ${r.seedMult !== 1 ? `<span>Seed bonuses</span><span>×${r.seedMult.toFixed(2)}</span>` : ''}
      ${r.fateMult !== 1 ? `<span>Fate</span><span>×${r.fateMult.toFixed(2)}</span>` : ''}
      ${r.curseMult !== 1 ? `<span>Curses</span><span>×${r.curseMult.toFixed(2)}</span>` : ''}
      ${r.tier ? `<span>Speed: ${r.tier.name}</span><span>${r.speedBonus ? '+' + Math.round(r.speedBonus * 100) + '%' : '—'}</span>` : ''}
      ${r.failed ? `<span>Run failed</span><span>×${D().seeds.failMult}</span>` : ''}
      <span class="total">Yggdrasil Seeds</span><span class="total">${r.total}</span>
    </div>`;
  }

  function ragnarokConfirm(s) {
    const r = Game.seedReward(s);
    return `<h2>Ragnarök</h2><p class="lead">Surtr's fire takes the nine realms. Runes, upgrades and unlocks are lost. Seeds and what you plant with them remain.</p>
      ${rewardTable(r)}
      <div class="actions"><button class="btn" data-act="close">Not yet</button><button class="btn danger" data-act="ragnarokConfirm">Let it burn</button></div>`;
  }

  function ragnarokResult(r) {
    const onOwn = r.first ? `<p class="center" style="margin-top:16px"><i>"You are on your own now."</i></p><p class="muted center">Odin's Blessing is gone. From now on the Norns weave a fate for every run, each new realm offers you a boon, and Seeds can be spent in the Seeds tab.</p>` : '';
    return `<h2>${r.failed ? 'The World Ends Early' : 'The World Burns'}</h2><p class="lead">From the ashes, Yggdrasil drops its seeds.</p>${rewardTable(r)}${onOwn}
      <div class="actions"><button class="btn primary" data-act="close">${r.first ? 'Begin again' : 'Rise again'}</button></div>`;
  }

  function failedModal(s) {
    const c = Game.lookup().curses[s.run.ended.curse];
    return `<h2>${esc(c.failText || 'The run has failed.')}</h2><p class="lead">${esc(c.name)} has run out of time. Ragnarök comes early, but nothing is wasted.</p>
      ${rewardTable(Game.seedReward(s, true))}
      <div class="actions"><button class="btn danger" data-act="ragnarokConfirm">Face Ragnarök</button></div>`;
  }

  function offlineModal(sum) {
    const runes = Object.keys(sum.runes).map((r) => `<span style="--rc:${realm(r).color}">${rglyph(r, 14)} +${fmt(sum.runes[r])}</span>`).join(' ');
    if (sum.clickOnly && sum.mined <= 0) {
      return `<h2>While You Slept</h2><p class="lead">You were away ${fmtDuration(sum.seconds)}.</p>
        <p class="center">Under Ymir's Hands only your own clicks mine, so nothing was dug while you were gone.</p>
        <div class="actions"><button class="btn primary" data-act="close">Back to work</button></div>`;
    }
    return `<h2>While You Slept</h2><p class="lead">You were away ${fmtDuration(sum.seconds)}.</p>
      <p class="center">Your miners dug <b>${fmt(sum.mined)}</b> Blank Runes${sum.capped ? ` (capped at ${fmtDuration(sum.used)} away)` : ''}.</p>
      ${runes ? `<p class="center">${runes}</p>` : ''}
      <div class="actions"><button class="btn primary" data-act="close">Back to work</button></div>`;
  }

  function introModal() {
    return `<div class="discover-glyph" style="color:#ffd34d">${G.glyph('ansuz', { size: 56 })}</div>
      <h2>Rune Clicker</h2><p class="lead">The nine realms hang from the branches of Yggdrasil.</p>
      <p>You are a runecarver of Midgard. Tap the stone to mine <b>Blank Runes</b>. Imbue them into the realms you reach to make realm runes, and spend those to climb the World Tree toward Asgard.</p>
      <p class="muted">Odin watches your first climb. His blessing makes the way cheaper. It will not last.</p>
      <div class="actions"><button class="btn primary" data-act="close">Take up the chisel</button></div>`;
  }

  function blessingText() {
    const b = D().blessing;
    return `Realm unlocks cost ${Math.round((1 - b.unlockCostMult) * 100)}% less and upgrades ${Math.round((1 - b.upgradeCostMult) * 100)}% less this run. The blessing ends at Ragnarök.`;
  }

  // Short pop that floats up from an element, e.g. a double imbue.
  function pop(el, text, color) {
    if (!el || !document.body.contains(el)) return;
    const r = el.getBoundingClientRect();
    const p = document.createElement('div');
    p.className = 'pop';
    p.textContent = text;
    if (color) p.style.setProperty('--rc', color);
    p.style.left = (r.left + r.width / 2) + 'px';
    p.style.top = r.top + 'px';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1100);
    el.classList.remove('doubled');
    void el.offsetWidth;
    el.classList.add('doubled');
  }

  function runInfoModal(s) {
    const run = s.run, I = Game.lookup();
    const items = [];
    if (run.blessing) items.push(`<li class="item"><span class="name">${D().blessing.name}</span><span class="desc">${blessingText()}</span></li>`);
    if (run.fate) items.push(`<li class="item"><span class="name">Fate: ${esc(I.fates[run.fate].name)}</span><span class="desc">${esc(I.fates[run.fate].desc)}</span></li>`);
    run.curses.forEach((c) => items.push(`<li class="item" style="border-color:#e5604d66"><span class="name">Curse: ${esc(I.curses[c].name)}</span><span class="desc">${esc(I.curses[c].desc)}</span></li>`));
    Object.keys(run.boons).forEach((id) => {
      const b = I.boons[id], t = run.boons[id];
      items.push(`<li class="item"><span class="name">${esc(b.name)}<span class="lvl">tier ${t}</span></span><span class="desc">${esc(boonDesc(b, t))}</span></li>`);
    });
    return `<h2>This Run</h2><ul class="list boon-list">${items.join('') || '<li class="muted center">Nothing yet.</li>'}</ul>
      <div class="actions"><button class="btn" data-act="close">Close</button></div>`;
  }

  root.RC.UI = {
    ui, fmt, fmtRound, fmtTime, blessingText, pop, render, refresh, renderStone, floater, toast, discoverToast,
    openModal, closeModal, modalOpen, choiceModal, ragnarokConfirm, ragnarokResult, failedModal, offlineModal, introModal, runInfoModal, boonDesc,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
