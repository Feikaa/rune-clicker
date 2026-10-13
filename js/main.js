/*
 * Bootstraps the game: load/save, main loop, input and modal flow.
 */
(function () {
  'use strict';

  const { Game, UI, Sound } = window.RC;
  const SAVE_KEY = 'runeClicker.save.v1';
  const AUTOSAVE_MS = 10000;
  const OFFLINE_GAP = 5; // seconds of frame gap treated as time away

  let state;
  let modalKind = null; // 'choice' | 'failed' | 'info' | null
  let lastImbueEl = null; // button behind the latest imbue, for the double-imbue pop
  const modalQueue = [];

  // ------------------------------------------------------------------ persistence
  function save() {
    try { localStorage.setItem(SAVE_KEY, Game.serialize(state)); state.lastSaved = Date.now(); } catch (e) { /* storage unavailable */ }
  }

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { /* storage unavailable */ }
    if (!raw) return null;
    try { return Game.deserialize(raw); } catch (e) { return null; }
  }

  // ------------------------------------------------------------------ modals
  function queueModal(html, narrow, urgent) { modalQueue.push({ html, narrow, urgent }); }

  // Pick what (if anything) the modal should show. An open info modal is never
  // replaced; urgent info (the Ragnarök result) goes before game-driven choices.
  function syncModal() {
    if (modalKind === 'info') return;
    const showQueued = () => {
      const m = modalQueue.shift();
      modalKind = 'info';
      UI.openModal(m.html, m.narrow);
    };
    if (modalQueue.length && modalQueue[0].urgent) return showQueued();
    if (state.run.pending) {
      if (modalKind !== 'choice') { modalKind = 'choice'; UI.openModal(UI.choiceModal(state)); }
      return;
    }
    if (state.run.ended) {
      if (modalKind !== 'failed') { modalKind = 'failed'; UI.openModal(UI.failedModal(state), true); }
      return;
    }
    if (modalKind) { modalKind = null; UI.closeModal(); }
    if (modalQueue.length) showQueued();
  }

  function closeInfo() {
    if (modalKind !== 'info') return;
    modalKind = null;
    UI.closeModal();
    syncModal();
  }

  // ------------------------------------------------------------------ events from game
  function drainEvents() {
    const evs = state.events || [];
    state.events = [];
    evs.forEach((e) => {
      if (e.type === 'discover') UI.discoverToast(e.key);
      else if (e.type === 'double') {
        Sound.double();
        UI.pop(lastImbueEl, `Double! +${UI.fmt(e.extra)}`, window.RC.DATA.realms[e.realm].color);
      }
      else if (e.type === 'unlock' && e.realm === 'svartalfheim' && !Game.tutorialDone(state.meta)) UI.toast('<div><b>The World Tree</b><p>Yggdrasil reveals itself. A new tab has opened.</p></div>', '#7fd6a8');
      else if (e.type === 'unlock' && e.realm === 'asgard') UI.toast('<div><b>Ragnarök</b><p>Asgard is reached. The end of the world is yours to call.</p></div>', '#ff8a73', 7000);
      else if (e.type === 'freeMiner') UI.toast("<div><b>Tinkerer's Luck</b><p>A second miner tags along for free.</p></div>", '#c9824a', 2500);
      else if (e.type === 'freeBoon') UI.toast(`<div><b>Wanderer's Road</b><p>You start with ${Game.lookup().boons[e.boon].name}.</p></div>`, '#c6d6ff');
      else if (e.type === 'timerBeaten') UI.toast(`<div><b>Chain held</b><p>You reached Asgard in time. ${Game.lookup().curses[e.curse].name} is satisfied.</p></div>`, '#7fd6a8');
    });
  }

  // ------------------------------------------------------------------ sound
  const realmIndex = (id) => window.RC.DATA.realmOrder.indexOf(id);

  function bought(el, ok, level, max) {
    if (ok) Sound.buy(level, max);
    else if (!el.classList.contains('maxed')) Sound.deny();
  }

  // Render first so the twig is at its new size, bring the map into view if
  // it has scrolled away (it sits above the list on phones), then animate.
  function growTree(id, from, to) {
    UI.render(state);
    const map = document.querySelector('.tree-map');
    if (!map) return;
    const r = map.getBoundingClientRect();
    const hidden = r.bottom < 160 || r.top > window.innerHeight - 80;
    if (hidden) window.scrollTo({ top: window.scrollY + r.top - 140, behavior: 'smooth' });
    setTimeout(() => UI.animateTreeGrowth(id, from, to, () => Sound.bloom()), hidden ? 380 : 0);
  }

  function applySoundSettings() {
    Sound.setEnabled(state.settings.sound !== false);
    Sound.setVolume(typeof state.settings.volume === 'number' ? state.settings.volume : 0.6);
  }

  // ------------------------------------------------------------------ actions
  function act(name, el) {
    const [cmd, a, b] = name.split(':');
    switch (cmd) {
      case 'tab': UI.ui.tab = a; break;
      case 'realm': UI.ui.realm = a; break;
      case 'goto': UI.ui.realm = a; UI.ui.tab = 'realms'; window.scrollTo({ top: 0, behavior: 'smooth' }); break;
      case 'imbue':
        lastImbueEl = el;
        if (Game.imbue(state, a, b === 'max' ? 'max' : Number(b)) > 0) Sound.imbue(realmIndex(a));
        else Sound.deny();
        break;
      case 'imbueMissing':
        lastImbueEl = el;
        if (Game.imbueMissing(state)) Sound.imbue(realmIndex(Game.nextRealm(state)) - 1);
        else Sound.deny();
        break;
      case 'buy': bought(el, Game.buyUpgrade(state, a), state.run.upgrades[a], Game.lookup().upgrades[a].max); break;
      case 'tree': {
        const from = state.run.tree[a] || 0;
        const ok = Game.buyTree(state, a);
        bought(el, ok, state.run.tree[a], Game.lookup().tree[a].max);
        if (ok) growTree(a, from, state.run.tree[a]);
        break;
      }
      case 'perm': bought(el, Game.buyPerm(state, a), state.meta.perm[a], Game.lookup().perm[a].max); save(); break;
      case 'unlock':
        if (Game.unlockNext(state)) { UI.ui.realm = state.run.unlocked[state.run.unlocked.length - 1]; Sound.realm(); save(); }
        else Sound.deny();
        break;
      case 'sound':
        state.settings.sound = !state.settings.sound;
        applySoundSettings();
        Sound.unlock();
        Sound.buy(1, 2);
        save();
        break;
      case 'auto': {
        const w = state.run.autoWeights;
        w[a] = Math.max(0, Math.min(9, (w[a] || 0) + Number(b)));
        break;
      }
      case 'choose':
        if (Game.choose(state, Number(a))) save();
        break;
      case 'reroll':
        if (Game.reroll(state)) UI.openModal(UI.choiceModal(state));
        break;
      case 'ragnarok':
        queueModal(UI.ragnarokConfirm(state), true);
        break;
      case 'ragnarokConfirm': {
        if (modalKind === 'info') { modalKind = null; UI.closeModal(); }
        const r = Game.ragnarok(state);
        if (r) {
          UI.ui.realm = 'midgard';
          UI.ui.tab = 'realms';
          modalKind = null;
          UI.closeModal();
          queueModal(UI.ragnarokResult(r), true, true);
          save();
        }
        break;
      }
      case 'info':
        queueModal(a === 'blessing'
          ? `<h2>Odin's Blessing</h2><p class="lead">The Allfather watches your first climb.</p><p class="center">${UI.blessingText()}</p><div class="actions"><button class="btn" data-act="close">Close</button></div>`
          : UI.runInfoModal(state), true);
        break;
      case 'close': closeInfo(); break;
      case 'resetRun':
        queueModal(UI.resetRunModal(state), true);
        break;
      case 'resetRunConfirm':
        if (modalKind === 'info') { modalKind = null; UI.closeModal(); }
        Game.resetRun(state);
        UI.ui.tab = 'realms'; UI.ui.realm = 'midgard';
        UI.toast('<div><b>The run begins anew</b><p>Back to Midgard.</p></div>', null, 2500);
        save();
        break;
      case 'skipTutorial': {
        const started = state.run.activeTime > 5 || state.run.unlocked.length > 1;
        if (started && !window.confirm("Skip the tutorial? This run restarts without Odin's Blessing, and you give up the 5 Seeds from the first Ragnarök.")) break;
        if (Game.skipTutorial(state)) {
          if (modalKind === 'info') { modalKind = null; UI.closeModal(); }
          UI.ui.tab = 'realms'; UI.ui.realm = 'midgard';
          save();
        }
        break;
      }
      case 'save': save(); UI.toast('<div><b>Saved</b></div>', null, 1500); break;
      case 'export': {
        const data = btoa(unescape(encodeURIComponent(Game.serialize(state))));
        queueModal(`<h2>Export Save</h2><p class="lead">Copy this text somewhere safe.</p><textarea class="save" readonly>${data}</textarea><div class="actions"><button class="btn" data-act="close">Done</button></div>`);
        break;
      }
      case 'import': {
        const txt = window.prompt('Paste an exported save:');
        if (!txt) break;
        try {
          state = Game.deserialize(decodeURIComponent(escape(atob(txt.trim()))));
          applySoundSettings();
          save();
          UI.render(state, true);
          UI.toast('<div><b>Save imported</b></div>', null, 2000);
        } catch (e) {
          UI.toast('<div><b>That save could not be read</b></div>', '#e5604d', 3000);
        }
        break;
      }
      case 'reset':
        if (window.confirm('Erase all progress, including Seeds? This cannot be undone.')) {
          state = Game.newState();
          save();
          UI.ui.tab = 'realms'; UI.ui.realm = 'midgard';
          UI.render(state, true);
          queueModal(UI.introModal(), true);
        }
        break;
      default: break;
    }
    UI.render(state);
    syncModal();
  }

  // ------------------------------------------------------------------ clicking the rune
  function mine(evt) {
    if (UI.modalOpen()) return;
    const res = Game.click(state);
    if (!res) return;
    Sound.click(res.crit);
    const btn = document.getElementById('rune');
    const box = btn.getBoundingClientRect();
    const stage = btn.parentElement.getBoundingClientRect();
    let x, y;
    if (evt && evt.clientX) { x = evt.clientX - stage.left; y = evt.clientY - stage.top; }
    else { x = box.left - stage.left + box.width / 2; y = box.top - stage.top + box.height / 3; }
    x += (Math.random() - 0.5) * 30;
    if (res.capped && res.gained <= 0) UI.floater('Full', 'capped', x, y);
    else UI.floater((res.crit ? 'Crit! +' : '+') + UI.fmtRound(res.gained), res.crit ? 'crit' : '', x, y);
    btn.classList.add('hit');
    setTimeout(() => btn.classList.remove('hit'), 70);
  }

  // ------------------------------------------------------------------ loop
  let last = performance.now();
  let lastRefresh = 0;
  let lastSave = Date.now();

  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > OFFLINE_GAP) {
      const sum = Game.applyOffline(state, dt);
      if (sum && (sum.mined > 0 || sum.clickOnly) && dt > 60) queueModal(UI.offlineModal(sum), true);
    } else if (dt > 0) {
      Game.tick(state, dt);
    }
    drainEvents();
    if (now - lastRefresh > 100) {
      lastRefresh = now;
      UI.render(state);
      UI.renderStone(state);
      UI.refresh(state);
      syncModal();
    }
    if (Date.now() - lastSave > AUTOSAVE_MS) { lastSave = Date.now(); save(); }
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------------ init
  function init() {
    const loaded = load();
    state = loaded || Game.newState();
    UI.ui.realm = state.run.unlocked[state.run.unlocked.length - 1];
    if (!loaded) queueModal(UI.introModal(), true);
    else {
      const away = (Date.now() - (state.lastSaved || Date.now())) / 1000;
      const sum = Game.applyOffline(state, away);
      if (sum && (sum.mined > 0 || sum.clickOnly) && away > 60) queueModal(UI.offlineModal(sum), true);
    }
    state.events = [];

    applySoundSettings();
    // Browsers only allow audio after a user gesture.
    ['pointerdown', 'keydown'].forEach((t) => document.addEventListener(t, () => Sound.unlock(), { capture: true }));
    document.addEventListener('input', (e) => {
      if (e.target.id !== 'volume') return;
      state.settings.volume = Number(e.target.value) / 100;
      applySoundSettings();
    });
    document.addEventListener('change', (e) => {
      if (e.target.id !== 'volume') return;
      Sound.buy(1, 2);
      save();
    });

    const rune = document.getElementById('rune');
    rune.addEventListener('click', mine);
    document.addEventListener('keydown', (e) => {
      if ((e.code === 'Space' || e.key === ' ') && !e.repeat && !UI.modalOpen() && !e.target.closest('button, input, textarea')) {
        e.preventDefault();
        mine(null);
      }
      if (e.key === 'Escape' && modalKind === 'info') closeInfo();
    });
    document.addEventListener('click', (e) => {
      if (e.target.closest('#rune')) return;
      const el = e.target.closest('[data-act]');
      if (el) act(el.dataset.act, el);
    });
    document.getElementById('modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal' && modalKind === 'info') closeInfo();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    window.addEventListener('pagehide', save);

    UI.renderStone(state);
    UI.render(state, true);
    syncModal();
    requestAnimationFrame((t) => { last = t; frame(t); });
  }

  // Handle for the browser console and automated checks.
  window.RC.app = { get state() { return state; }, set state(v) { state = v; UI.render(state, true); }, save, syncModal };

  init();
})();
