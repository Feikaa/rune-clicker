/*
 * Sound effects, synthesized with the Web Audio API (no audio files).
 * The audio context starts on the first user gesture, as browsers require.
 */
(function (root) {
  'use strict';

  let ctx = null, master = null, noiseBuf = null;
  let enabled = true, volume = 0.6;
  let lastClick = 0;

  function init() {
    if (ctx) return ctx.state === 'running' || ctx.resume();
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(comp).connect(ctx.destination);
    // One second of white noise, reused for every stony tap.
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return true;
  }

  const ready = () => enabled && ctx && ctx.state === 'running';
  const vary = (x, amount) => x * (1 + (Math.random() - 0.5) * amount);

  // A single enveloped oscillator.
  function tone(freq, opts) {
    const o = Object.assign({ type: 'sine', at: 0, attack: 0.005, decay: 0.2, gain: 0.3, glide: null }, opts);
    const t = ctx.currentTime + o.at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type;
    osc.frequency.setValueAtTime(freq, t);
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(o.glide, t + o.decay);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain, t + o.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.attack + o.decay);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + o.attack + o.decay + 0.05);
  }

  // Filtered noise burst: chisel on stone.
  function noise(opts) {
    const o = Object.assign({ at: 0, freq: 2500, q: 1.5, decay: 0.06, gain: 0.4 }, opts);
    const t = ctx.currentTime + o.at;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = vary(1, 0.3);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = o.freq;
    f.Q.value = o.q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.decay);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + o.decay + 0.02);
  }

  // Pentatonic-ish scale so realm and level pitches always sound pleasant.
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const note = (base, step) => base * Math.pow(2, SCALE[Math.max(0, Math.min(SCALE.length - 1, step))] / 12);

  const Sound = {
    unlock: init, // call from any user gesture

    // Mining the stone: a stony tap with a little body. Throttled so auto-clickers stay listenable.
    click(crit) {
      if (!ready()) return;
      const now = ctx.currentTime;
      if (!crit && now - lastClick < 0.035) return;
      const busy = now - lastClick < 0.12;
      lastClick = now;
      const g = busy ? 0.6 : 1;
      noise({ freq: vary(2200, 0.4), q: 2, decay: 0.05, gain: 0.35 * g });
      tone(vary(180, 0.15), { type: 'triangle', decay: 0.08, gain: 0.25 * g, glide: 90 });
      if (crit) {
        tone(1568, { type: 'sine', decay: 0.35, gain: 0.18 });
        tone(2349, { type: 'sine', at: 0.04, decay: 0.4, gain: 0.12 });
      }
    },

    // Imbuing: a rising shimmer. Later realms sit higher.
    imbue(realmIndex) {
      if (!ready()) return;
      const f = note(392, realmIndex || 0);
      tone(f, { type: 'sine', attack: 0.01, decay: 0.28, gain: 0.16, glide: f * 1.5 });
      tone(f * 2, { type: 'triangle', at: 0.03, attack: 0.01, decay: 0.22, gain: 0.07, glide: f * 3 });
    },

    // A double imbue: a quick sparkle on top.
    double() {
      if (!ready()) return;
      [0, 0.06, 0.12].forEach((at, i) => tone(note(1046, i * 2), { at, decay: 0.18, gain: 0.1 }));
    },

    // Buying an upgrade: anvil strike. Higher levels ring higher; maxing adds a chord.
    buy(level, max) {
      if (!ready()) return;
      const step = max > 1 ? Math.round((level / max) * 6) : 6;
      const f = note(523, step);
      noise({ freq: 5000, q: 4, decay: 0.03, gain: 0.25 });
      tone(f, { type: 'triangle', decay: 0.5, gain: 0.2 });
      tone(f * 2.76, { type: 'sine', decay: 0.25, gain: 0.06 }); // inharmonic overtone: metallic
      if (level >= max) {
        tone(f * 1.25, { at: 0.08, decay: 0.6, gain: 0.12 });
        tone(f * 1.5, { at: 0.16, decay: 0.7, gain: 0.12 });
      }
    },

    // Unlocking a realm: a low horn-like swell and a bright fifth.
    realm() {
      if (!ready()) return;
      tone(196, { type: 'sawtooth', attack: 0.08, decay: 0.9, gain: 0.07 });
      tone(294, { type: 'triangle', attack: 0.08, decay: 0.9, gain: 0.12 });
      tone(392, { at: 0.15, attack: 0.05, decay: 0.9, gain: 0.12 });
      tone(784, { at: 0.3, decay: 0.8, gain: 0.08 });
    },

    // Can't afford it: a soft dull knock.
    deny() {
      if (!ready()) return;
      tone(110, { type: 'sine', decay: 0.09, gain: 0.18, glide: 80 });
    },

    setEnabled(on) { enabled = !!on; },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (master) master.gain.value = volume;
    },
  };

  root.RC = root.RC || {};
  root.RC.Sound = Sound;
})(typeof globalThis !== 'undefined' ? globalThis : this);
