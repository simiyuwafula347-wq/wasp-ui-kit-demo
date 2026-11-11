# WASP UI Kit

Three animated, beat-synced music player themes in plain HTML, CSS and JavaScript. No build step, no dependencies, no audio files.

| Theme | `data-theme` | Look |
|---|---|---|
| Lofi Record Cat | `lofi` | Warm paper tones, grain, a cat that nods on the beat |
| Chrono Gamer | `chrono` | Early-2000s bevels, title bars, LCD clock, level meter |
| Glitch Cyber Wasp | `wasp` | Black glass, acid green, scanlines, a pixel wasp with glitch ghosts |

## Quick start

1. Unzip the folder.
2. Open `index.html` in a browser. Press play, switch themes, poke the mascot.
3. Tap the mixer button to load your own audio file. The kit detects its beat.

## Files

```
index.html        demo page (reference markup)
src/base.css      tokens, layout, components, beat-driven motion
src/theme-*.css   one file per theme (only overrides tokens and flourishes)
src/sprites.js    the three SVG mascots, as strings in window.WaspSprites
src/beat.js       audio and rhythm engine, exposes window.WaspBeat
src/app.js        demo wiring: copy it as a starting point
LICENSE.txt
```

## Use it in your own page

1. Link `base.css` and the theme files you want.
2. Set `data-theme` on the **`<html>` element** (not `<body>`). The themes rely on selectors like `[data-theme=wasp] body`.
3. Add an element with class `stage` and inject a mascot: `stage.innerHTML = WaspSprites.wasp`.
4. Load `sprites.js`, then `beat.js`, then your script.
5. Toggle `playing` on `<body>` while music plays. The mascots start moving.

To keep only one theme, delete the other theme files and their sprites.

## Beat engine (`window.WaspBeat`)

| Call | What it does |
|---|---|
| `play(i?)` / `pause()` / `toggle()` | Control playback. `play(i)` starts demo track `i` |
| `select(i)` | Switch demo track (wraps around) |
| `setVolume(0..1)` / `mute(bool)` | Volume and mute |
| `seek(0..1)` | Jump to a fraction of the track |
| `position()` / `duration()` | Seconds |
| `levels(n)` | `n` spectrum values from 0 to 1, or `null` when idle |
| `loadFile(file)` | Play a user audio file and detect its beat |
| `blip(freq?)` | Short UI click sound |
| `tracks` | Demo track list: title, artist, bpm |

Events: `window.addEventListener("wasp:beat", e => …)` where `e.detail.n` is the beat number and `e.detail.bpm` is the tempo (0 for your own audio files). `WaspBeat.events` also fires `state`, `track` and `ended`.

## Theming

Everything is a CSS variable. Override them on `:root` or inside a theme block.

- Colors: `--bg --panel --panel2 --ink --dim --accent --accent2 --cyan --line`
- Shape and type: `--radius --shadow --font-ui --font-head --font-mono`
- Mascot colors: `--cat --ear`
- Effects: `--grain` and `--scan` (0 to 1)
- Set by the engine at runtime: `--beat` (a pulse from 1 down to 0), `--nod` (alternates 1 and −1), `--bpm`. `--speed` scales spin speed.

Create a theme by copying `theme-lofi.css`, renaming the `[data-theme=…]` selectors and changing the values.

## Animation hooks

Mascots are SVGs with `data-part` attributes. Every theme animates the same names, so a redrawn mascot works if it keeps them.

`record`, `disc` (spin) · `gear` (spin, reverse) · `head` (nod) · `tail` (wag) · `note` (pulse) · `ghost-a`, `ghost-b` (glitch layers) · wing frames `.w1`, `.w2`

Chrono also uses `#lcd` (clock text) and `.mbar` (meter bars), which `app.js` updates.

Body classes: `playing`, `calm` (near-zero motion), `glitch` (brief wasp glitch).

## Notes

- Motion respects `prefers-reduced-motion`.
- Chrono uses fixed colors for its bevels, so a custom accent only recolors the highlights.
- Browsers block audio until the first click or tap. That is normal.
- Beat detection on your own audio reads the low frequencies, so it works best on music with a clear kick.
- Opening `index.html` from disk works in current Chrome, Firefox, Safari and Edge.

## License

See `LICENSE.txt`.
