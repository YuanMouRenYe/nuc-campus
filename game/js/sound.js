// Sound: footsteps by surface, birds by day / crickets by night, class bell, quest chime.
// WebAudio, unlocked on the first key / touch (browsers block autoplay). All clips are CC0 (see CREDITS.md).
(function (root) {
  'use strict';
  const FILES = {
    concrete: ['step_concrete_000', 'step_concrete_001', 'step_concrete_002', 'step_concrete_003'],
    grass: ['step_grass_000', 'step_grass_001', 'step_grass_002'],
    wood: ['step_wood_000', 'step_wood_001', 'step_wood_002'],
    bell: ['bell', 'bell2'], birds: ['birds_day'], crickets: ['crickets_night'], rain: ['rain_loop'],
  };
  const S = { ac: null, buf: {}, muted: false, master: null, amb: {}, ready: false, loading: false, lastStep: 0, played: [] };
  function ctx() { const AC = root.AudioContext || root.webkitAudioContext; return AC ? new AC() : null; }
  async function loadAll() {
    if (S.loading) return; S.loading = true;
    const names = [...new Set(Object.values(FILES).flat())];
    await Promise.all(names.map(async n => { try { const r = await fetch('audio/' + n + '.mp3'); const a = await r.arrayBuffer(); S.buf[n] = await S.ac.decodeAudioData(a); } catch (e) { /* missing clip: stay silent */ } }));
    S.ready = true;
    for (const k of ['birds', 'crickets', 'rain']) { const b = S.buf[FILES[k][0]]; if (!b) continue;
      const src = S.ac.createBufferSource(), g = S.ac.createGain(); src.buffer = b; src.loop = true; g.gain.value = 0; src.connect(g).connect(S.master); src.start(); S.amb[k] = g; }
  }
  function unlock() {
    if (!S.ac) { S.ac = ctx(); if (!S.ac) return; S.master = S.ac.createGain(); S.master.gain.value = S.muted ? 0 : 1; S.master.connect(S.ac.destination); loadAll(); }
    if (S.ac.state === 'suspended') S.ac.resume();
  }
  function play(name, vol, rate) {
    S.played.push(name); if (S.played.length > 50) S.played.shift();
    if (!S.ac || !S.ready || S.muted) return; const b = S.buf[name]; if (!b) return;
    const src = S.ac.createBufferSource(), g = S.ac.createGain(); src.buffer = b; src.playbackRate.value = rate || 1; g.gain.value = vol; src.connect(g).connect(S.master); src.start();
  }
  const pick = a => a[(Math.random() * a.length) | 0];
  const Sound = {
    unlock,
    get muted() { return S.muted; },
    setMuted(m) { S.muted = !!m; if (S.master) S.master.gain.setTargetAtTime(S.muted ? 0 : 1, S.ac.currentTime, 0.05); },
    step(surface, running) { const now = performance.now(); if (now - S.lastStep < (running ? 170 : 240)) return; S.lastStep = now;
      play(pick(FILES[surface] || FILES.concrete), surface === 'grass' ? 0.35 : 0.28, 0.92 + Math.random() * 0.16); },
    bell(kind) { play('bell', 0.55); setTimeout(() => play('bell2', 0.45), 650); if (kind !== '下课') setTimeout(() => play('bell', 0.4), 1300); },
    chime() { // quest done: tiny two-note synth arpeggio (procedural, no asset)
      S.played.push('chime'); if (!S.ac || S.muted) return; const t = S.ac.currentTime;
      [[784, 0], [1046, 0.12], [1318, 0.24]].forEach(([f, d]) => { const o = S.ac.createOscillator(), g = S.ac.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.08, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.3); o.connect(g).connect(S.master); o.start(t + d); o.stop(t + d + 0.32); });
    },
    // ambience mix: day birds vs night crickets (by nightness 0..1), rain loop in rain; indoors muffled.
    // weather/season optional: rain hushes birds and crickets, snow hushes birds, no crickets in winter
    ambience(night, inside, weather, season) { S.amb_state = { night, inside, weather, season }; if (!S.ac || !S.ready) return; const t = S.ac.currentTime, k = inside ? 0.25 : 1;
      const wb = weather === 'rain' ? 0.1 : weather === 'snow' ? 0.3 : 1, wc = weather === 'rain' || season === 'winter' ? 0 : season === 'autumn' ? 0.6 : 1;
      if (S.amb.birds) S.amb.birds.gain.setTargetAtTime(0.32 * (1 - Math.min(1, night / 0.5)) * k * wb, t, 0.6);
      if (S.amb.crickets) S.amb.crickets.gain.setTargetAtTime(0.3 * Math.min(1, Math.max(0, (night - 0.25) / 0.45)) * k * wc, t, 0.6);
      if (S.amb.rain) S.amb.rain.gain.setTargetAtTime(weather === 'rain' ? (inside ? 0.12 : 0.42) : 0, t, 0.8); },
    debug: S,
  };
  root.Sound = Sound;
})(typeof window !== 'undefined' ? window : globalThis);
