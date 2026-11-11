/* WASP UI KIT - app.js : demo shell. Wires the DOM to WaspBeat (audio/beat) and WaspSprites (mascots).
   Copy and edit freely: it is the reference for how to use the kit in your own page. */
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const root = document.documentElement, B = WaspBeat;
  const fmt = s => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  const THEMES = { lofi: "Lofi Cat", chrono: "Chrono Deck", wasp: "Glitch Wasp" };
  const PALETTES = [["Theme default"], ["Acid", "#b6ff00", "#ff2bd6"], ["Honey", "#e8a05c", "#ff8f7a"], ["Ice", "#00e5ff", "#7c4dff"], ["Ember", "#ff6a3d", "#ffd23d"]];
  let beat = 0, nod = 1, beats = 0, bpm = 100, theme = "", lcd = null, mbars = [];

  const toastEl = $("#toast");
  const toast = m => { toastEl.textContent = m; toastEl.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove("show"), 1600); };
  const press = (sel, test) => $$(sel).forEach((el, i) => el.setAttribute("aria-pressed", !!test(el, i)));

  /* ---- theme: data-theme lives on <html>, the sprite is injected into .stage ---- */
  function setTheme(t, quiet) {
    theme = t; root.dataset.theme = t;
    root.style.removeProperty("--accent"); root.style.removeProperty("--accent2");
    const st = $("#stage"), put = () => { st.innerHTML = WaspSprites[t]; st.classList.remove("swap"); lcd = $("#lcd"); mbars = [...st.querySelectorAll(".mbar")]; };
    if (quiet) put(); else { st.classList.add("swap"); setTimeout(put, 140); B.blip(520); toast(THEMES[t]); }
    press("#themes .chip", el => el.dataset.t === t); press("#swatches .swatch", (el, i) => i === 0);
  }

  /* ---- particles ---- */
  function burst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const p = document.createElement("div"); p.className = "fx-p"; p.textContent = ["♪", "♫", "✦", "•"][i % 4];
      p.style.cssText = `left:${x}px;top:${y}px;--dx:${(Math.random() - .5) * 160}px;--dy:${-40 - Math.random() * 110}px;--rot:${(Math.random() - .5) * 120}deg`;
      document.body.appendChild(p); setTimeout(() => p.remove(), 900);
    }
  }

  /* ---- build UI ---- */
  Object.keys(THEMES).forEach(t => { const b = document.createElement("button"); b.className = "chip"; b.dataset.t = t; b.textContent = THEMES[t]; b.onclick = () => setTheme(t); $("#themes").appendChild(b); });
  PALETTES.forEach(([n, a, b2], i) => {
    const s = document.createElement("button"); s.className = "swatch";
    s.innerHTML = (a ? `<div class="dots"><i style="background:${a}"></i><i style="background:${b2}"></i></div>` : "") + n;
    s.onclick = () => {
      if (a) { root.style.setProperty("--accent", a); root.style.setProperty("--accent2", b2); } else { root.style.removeProperty("--accent"); root.style.removeProperty("--accent2"); }
      press("#swatches .swatch", (el, j) => j === i);
    };
    $("#swatches").appendChild(s);
  });
  const bars = Array.from({ length: 24 }, () => $("#bars").appendChild(document.createElement("span")));
  B.tracks.forEach((t, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="n">${i + 1}</span><span class="t">${t.title}</span><span class="b">${t.bpm} bpm</span>`;
    li.onclick = () => { B.select(i); if (!B.playing) B.play(); };
    $("#tracks").appendChild(li);
  });

  /* ---- player state ---- */
  function showTrack() {
    const file = B.mode === "file", t = B.tracks[B.index];
    $("#title").textContent = file ? B.fileName : t.title;
    $("#artist").textContent = file ? "Your audio · beat detection" : t.artist;
    $("#sBpm").textContent = file ? "auto" : t.bpm; $("#sSrc").textContent = file ? "File" : "Demo";
    bpm = file ? 100 : t.bpm; root.style.setProperty("--bpm", bpm); beats = 0; $("#sBeats").textContent = 0;
    $$("#tracks li").forEach((li, i) => li.classList.toggle("on", !file && i === B.index));
  }
  B.events.addEventListener("state", () => { document.body.classList.toggle("playing", B.playing); $("#play").textContent = B.playing ? "⏸" : "▶"; });
  B.events.addEventListener("track", showTrack);

  window.addEventListener("wasp:beat", e => {
    beat = 1; nod = -nod; beats++; $("#sBeats").textContent = beats;
    if (e.detail.bpm) { bpm = e.detail.bpm; root.style.setProperty("--bpm", bpm); }
    root.style.setProperty("--nod", nod);
    if (theme === "wasp" && e.detail.n % 4 === 0) { document.body.classList.add("glitch"); setTimeout(() => document.body.classList.remove("glitch"), 200); }
    if (e.detail.n % 2 === 0) { const r = $("#stage").getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 3, 2); }
  });

  /* ---- controls ---- */
  $("#play").onclick = () => B.toggle();
  $("#prev").onclick = () => { B.select(B.index - 1); if (!B.playing) B.play(); };
  $("#next").onclick = () => { B.select(B.index + 1); if (!B.playing) B.play(); };
  $("#prog").onclick = e => { const r = e.currentTarget.getBoundingClientRect(); B.seek((e.clientX - r.left) / r.width); };
  $("#stage").onclick = e => { beat = 1; B.blip(400 + Math.random() * 500); burst(e.clientX, e.clientY, 6); };
  $("#calm").onchange = e => document.body.classList.toggle("calm", e.target.checked);
  $("#pick").oninput = e => { root.style.setProperty("--accent", e.target.value); press("#swatches .swatch", () => false); };
  $("#vol").oninput = e => B.setVolume(+e.target.value);
  $("#mute").onchange = e => B.mute(e.target.checked);
  $("#file").onchange = e => { const f = e.target.files[0]; if (f) toast(B.loadFile(f) ? "Loaded " + f.name : "Audio is not supported here"); };
  $("#fab").onclick = () => $("#ov").classList.add("open");
  $("#ovx").onclick = () => $("#ov").classList.remove("open");
  $$(".nav button").forEach(b => b.onclick = () => {
    $$(".view").forEach(v => v.classList.toggle("active", v.id === "v-" + b.dataset.v));
    $$(".nav button").forEach(n => n.toggleAttribute("aria-current", n === b)); if (b.hasAttribute("aria-current")) b.setAttribute("aria-current", "page");
  });
  addEventListener("keydown", e => {
    if (e.target.closest("button,input,label")) return;
    if (e.code === "Space") { e.preventDefault(); B.toggle(); } else if (e.code === "ArrowRight") $("#next").click(); else if (e.code === "ArrowLeft") $("#prev").click();
  });

  /* ---- frame loop: the beat pulse, spectrum, progress, Chrono LCD and meter ---- */
  function frame() {
    beat *= .88; root.style.setProperty("--beat", beat.toFixed(3));
    const lv = B.levels(bars.length), p = B.position(), d = B.duration();
    bars.forEach((b, i) => b.style.transform = `scaleY(${lv ? Math.max(.08, lv[i]) : .08})`);
    $("#prog i").style.width = (d ? Math.min(100, p / d * 100) : 0) + "%"; $("#cur").textContent = fmt(p); $("#dur").textContent = fmt(d);
    if (lcd) lcd.textContent = fmt(p).padStart(5, "0");
    mbars.forEach((m, i) => { const h = 3 + (lv ? lv[Math.floor(i / mbars.length * lv.length)] : 0) * 19; m.setAttribute("height", h); m.setAttribute("y", 100 - h); });
    requestAnimationFrame(frame);
  }

  setTheme("lofi", true); showTrack(); frame();
})();
