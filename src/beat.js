/* WASP UI KIT - beat.js
   One small engine for rhythm sync. Two sources, same events:
   1) built-in demo loops (WebAudio synth, no audio files needed)
   2) the buyer's own audio file (onset detection on the low band)
   Listen with:  window.addEventListener("wasp:beat", e => ...)   (e.detail.n = beat number) */
(function () {
  const TRACKS = [
    { title: "Honey Static", artist: "Demo loop / lofi", bpm: 84, len: 132, root: 55,
      kick: [1,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0], hat: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,1,1,0], bass: [0,0,0,0, 3,0,0,0, 5,0,0,0, 3,0,0,0] },
    { title: "Chrono Drift", artist: "Demo loop / breaks", bpm: 110, len: 118, root: 62,
      kick: [1,0,0,1, 0,0,1,0, 1,0,0,0, 0,0,1,0], hat: [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1], bass: [0,0,0,0, 7,0,0,0, 0,0,5,0, 3,0,0,0] },
    { title: "Neon Hive", artist: "Demo loop / glitch", bpm: 128, len: 96, root: 49,
      kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], hat: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,1], bass: [1,0,1,0, 0,0,3,0, 1,0,1,0, 0,0,5,0] }
  ];
  const SCALE = [0, 2, 3, 5, 7, 8, 10, 12];
  const B = { tracks: TRACKS, index: 0, playing: false, volume: 0.8, muted: false, mode: "demo", ctx: null,
              events: new EventTarget(), beatN: 0, fileName: "" };
  let master, analyser, noise, timer, nextStep = 0, step = 0, startedAt = 0, offset = 0, audio, fileSrc, raf, lastBeat = 0, prevLow = 0, fluxAvg = 0, silentTimer = 0;
  const bins = new Uint8Array(256);

  function ensure() {
    if (B.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    B.ctx = new AC();
    master = B.ctx.createGain(); analyser = B.ctx.createAnalyser();
    analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.6;
    master.connect(analyser); analyser.connect(B.ctx.destination);
    noise = B.ctx.createBuffer(1, Math.floor(B.ctx.sampleRate * 0.12), B.ctx.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVolume();
    return true;
  }
  function applyVolume() { if (master) master.gain.value = B.muted ? 0 : B.volume; if (audio) audio.volume = 1; }
  function emit(type, detail) { B.events.dispatchEvent(new CustomEvent(type, { detail })); if (type === "beat") window.dispatchEvent(new CustomEvent("wasp:beat", { detail })); }

  function kick(t) { const o = B.ctx.createOscillator(), g = B.ctx.createGain(); o.type = "sine";
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.95, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.32); }
  function hat(t) { const s = B.ctx.createBufferSource(), f = B.ctx.createBiquadFilter(), g = B.ctx.createGain(); s.buffer = noise; f.type = "highpass"; f.frequency.value = 7000;
    g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.06); }
  function bass(t, deg, len) { const o = B.ctx.createOscillator(), g = B.ctx.createGain(); o.type = "triangle";
    o.frequency.value = TRACKS[B.index].root * Math.pow(2, SCALE[deg % SCALE.length] / 12);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.34, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + len); o.connect(g); g.connect(master); o.start(t); o.stop(t + len + 0.02); }
  B.blip = function (freq) { if (!ensure() || B.muted) return; const t = B.ctx.currentTime, o = B.ctx.createOscillator(), g = B.ctx.createGain();
    o.type = "square"; o.frequency.value = freq || 660; g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07); o.connect(g); g.connect(B.ctx.destination); o.start(t); o.stop(t + 0.08); };

  function scheduler() {
    const tr = TRACKS[B.index], dur = 60 / tr.bpm / 4;
    while (nextStep < B.ctx.currentTime + 0.12) {
      const s = step % 16, t = nextStep;
      if (tr.kick[s]) kick(t); if (tr.hat[s]) hat(t); if (tr.bass[s]) bass(t, tr.bass[s], dur * 3);
      if (s % 4 === 0) { const n = B.beatN++; setTimeout(() => { if (B.playing && B.mode === "demo") emit("beat", { n, bpm: tr.bpm }); }, Math.max(0, (t - B.ctx.currentTime) * 1000)); }
      nextStep += dur; step++;
    }
  }
  function fileLoop() {
    if (!B.playing || B.mode !== "file") return;
    analyser.getByteFrequencyData(bins);
    let low = 0; for (let i = 0; i < 6; i++) low += bins[i]; low /= 6;
    const flux = Math.max(0, low - prevLow); prevLow = low; fluxAvg = fluxAvg * 0.94 + flux * 0.06;
    const now = performance.now();
    if (flux > fluxAvg * 2.2 + 8 && now - lastBeat > 240) { lastBeat = now; emit("beat", { n: B.beatN++, bpm: 0 }); }
    raf = requestAnimationFrame(fileLoop);
  }

  B.play = function (i) {
    if (typeof i === "number") B.index = i;
    B.pause(true);
    B.playing = true;
    if (!ensure()) {                                   // no WebAudio: keep the visuals alive with a silent clock
      const bpm = TRACKS[B.index].bpm; silentTimer = setInterval(() => emit("beat", { n: B.beatN++, bpm }), 60000 / bpm);
      emit("state", {}); return;
    }
    B.ctx.resume();
    if (B.mode === "file" && audio) { audio.play(); cancelAnimationFrame(raf); raf = requestAnimationFrame(fileLoop); }
    else { B.mode = "demo"; step = 0; B.beatN = 0; nextStep = B.ctx.currentTime + 0.08; startedAt = nextStep - offset; timer = setInterval(scheduler, 25); }
    emit("state", {});
  };
  B.pause = function (silent) {
    if (!silent && B.playing) offset = B.position();
    clearInterval(timer); clearInterval(silentTimer); cancelAnimationFrame(raf);
    if (audio) audio.pause();
    B.playing = false; if (!silent) emit("state", {});
  };
  B.toggle = function () { B.playing ? B.pause() : B.play(); };
  B.select = function (i) { B.index = (i + TRACKS.length) % TRACKS.length; B.mode = "demo"; offset = 0; const was = B.playing; B.pause(true); emit("track", { index: B.index }); if (was) B.play(); else emit("state", {}); };
  B.setVolume = function (v) { B.volume = v; applyVolume(); };
  B.mute = function (m) { B.muted = !!m; applyVolume(); };
  B.position = function () { if (B.mode === "file" && audio) return audio.currentTime; if (!B.ctx) return offset; return B.playing ? (B.ctx.currentTime - startedAt) % TRACKS[B.index].len : offset; };
  B.duration = function () { return B.mode === "file" && audio && isFinite(audio.duration) ? audio.duration : TRACKS[B.index].len; };
  B.seek = function (f) { const t = f * B.duration(); if (B.mode === "file" && audio) audio.currentTime = t; else { offset = t; if (B.playing && B.ctx) startedAt = B.ctx.currentTime - t; } };
  B.levels = function (n) { if (!analyser || !B.ctx || !B.playing) return null; analyser.getByteFrequencyData(bins); const out = [];
    for (let i = 0; i < n; i++) { const a = Math.floor(Math.pow(i / n, 1.6) * 90), b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / n, 1.6) * 90)); let s = 0; for (let k = a; k < b; k++) s += bins[k]; out.push(Math.min(1, s / (b - a) / 220)); } return out; };
  B.loadFile = function (file) {
    if (!file || !ensure()) return false;
    B.pause(true);
    if (audio) URL.revokeObjectURL(audio.src);
    audio = new Audio(URL.createObjectURL(file));
    if (fileSrc) fileSrc.disconnect();
    fileSrc = B.ctx.createMediaElementSource(audio); fileSrc.connect(master);
    audio.addEventListener("ended", () => { B.pause(); emit("ended", {}); });
    B.mode = "file"; B.fileName = file.name.replace(/\.[^.]+$/, "");
    applyVolume(); emit("track", { index: -1, file: B.fileName }); B.play(); return true;
  };
  window.WaspBeat = B;
})();
