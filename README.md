# Thesis Atlas

Interactive, deep-zoom diagram for the thesis
**Bridging Policy and Climate Data using Semantic AI and Digital Twin**.

Inspired by *Calculating Empires* — black ground, white ink, archival typography,
keyboard-driven tour for presentations and screen recordings.

---

## Run locally

No build step. Any static server works:

```bash
# pick one
python3 -m http.server 8000
# or
npx serve .
```

Open `http://localhost:8000/`.

Opening `index.html` directly (file://) **will not work** — the JSON fetch
needs a server.

---

## Deploy to GitHub Pages

1. Create a new repo, e.g. `thesis-atlas`.
2. Push these files to the `main` branch.
3. Repo → **Settings → Pages → Source = `main` / root**.
4. Your atlas is live at `https://<username>.github.io/thesis-atlas/`.

That URL goes in the thesis PDF, in committee emails, and behind your QR code.

---

## Controls

| Key | Action |
|-----|--------|
| `0` | Overview (fit all bands) |
| `1` | Band 01 — Input Data |
| `2` | Policy Corpus (deep zoom) |
| `3` | Band 02 — Semantic AI |
| `4` | ClimateBERT (deep zoom) |
| `5` | Band 03 — Impact Model |
| `6` | Aggravation Output (deep zoom) |
| `7` | Band 04 — Spatial Reflection |
| `8` | El Raval worked example (deep zoom) |
| `9` | Band 05 — Simulation & Output |
| `←↑↓→` | Pan |
| `+ −` | Zoom |
| `H` | Hide all HUD chrome — use when screen-recording |
| `P` | Log current transform to console (handy when authoring new bookmarks) |
| click on a module | Fly to it at zoom ×8 |
| mouse wheel | Free zoom |
| drag | Pan |

---

## Editing content

**You do not need to touch the JS.** All labels and structure live in JSON.

### `data/structure.json`

- `bands` — top-level horizontal sections. Add/remove freely.
- Each band has `modules`; each module has `title`, `summary`, and `details`
  (the bullet list shown at deep zoom).
- `flows` — connecting lines between modules: `{ "from": "id_a", "to": "id_b" }`.
  The line is drawn from the bottom of `from` to the top of `to`, so flows
  naturally flow downward across bands.

### `data/bookmarks.json`

Each entry binds a keyboard key to a camera position:

```json
{ "key": "8", "label": "El Raval worked example", "target": "neighborhood_example", "k": 8 }
```

- `target` is a module `id` *or* a band id like `band_03`.
- `k` is the zoom scale (1 = overview, 8 ≈ module detail, 20+ = very tight).
- For the overview shortcut, omit `target` and the script auto-fits the world.

To author a new bookmark:
1. Run the atlas, pan/zoom to the framing you want.
2. Press `P` — the current `x, y, k` prints to the browser console.
3. Either reference a module id, or convert that to a `target`. Simplest is to
   pick the nearest module id.

---

## Recording your presentation

1. Open in a browser, full-screen the window (F11).
2. Press `H` to hide the HUD chrome — pure black + your diagram.
3. Start your screen recorder.
4. Walk through `1 → 2 → 3 → …` for the scripted tour.
5. Press `H` again to restore controls.

Each transition is a `d3.easeCubicInOut` over 1.1 s — clean and presentation-grade.

---

## Aesthetic

- Background: `#000000`
- Ink: `#ffffff` (full), `rgba(255,255,255,0.55)` (dim), `0.22` (faint), `0.08` (ghost grid)
- Type: **IBM Plex Serif** (headers) + **IBM Plex Mono** (everything else)
- Hairline strokes: 0.25–0.6 px
- No color, no gradients, no shadows. Calculating Empires discipline.

If you want subtle band-coding later (e.g. a different white-tint per band),
edit `.band-frame` per band in `style.css`. I'd resist it — the unity is the look.

---

## File map

```
index.html              shell · loads D3 from CDN
style.css               all visual rules
script.js               layout · zoom · LOD · keyboard
data/structure.json     bands · modules · flows
data/bookmarks.json     keyboard tour
README.md               this file
```

---

## Citing

Methodology and content reflect the thesis pipeline:
LANDSAT LST · SPEI · ClimateBERT · SHAP · DNN · SOLWEIG-GPU · ENVI-MET ·
Ladybug Comfort SDK · IPCC WGII AR5.
