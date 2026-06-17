/* ============================================================
   THESIS ATLAS · SVG edition
   Loads the static diagram, D3 zoom + keyboard bookmarks
   Bookmark regions derived from <g id="Zooms"> in the SVG
   ============================================================ */

const SVG_W = 1920;
const SVG_H = 1080;

// 12 zoom boxes from the updated SVG's Zooms layer.
// slide:true  → camera pans top→bottom instead of a static fit
// slideBottom → SVG y-coordinate where the slide ends (defaults to bm.y+bm.h)
const BOOKMARKS = [
  { key: '0', label: 'Overview' },

  // ── Column 1: Data ──
  { key: '1', label: 'Data — Overview',            x:  17,     y:  13.17, w: 320.94, h: 320.94 },
  { key: '2', label: 'Data — Stack',               x:  17,     y: 334.11, w: 320.94, h: 280.12 },
  { key: '3', label: 'Data — Heat & Drought',      x:  17,     y: 611.89, w: 320.94, h: 224.45 },
  { key: '4', label: 'Data — Vulnerable Pop.',     x:  17,     y: 836.79, w: 320.94, h: 163.41 },

  // ── Column 2: Analytics / SHAP ──
  { key: '5', label: 'SHAP — Framework',           x: 342.02,  y:  13.17, w: 304.85, h: 411.32 },
  { key: '6', label: 'SHAP — Results',             x: 342.02,  y: 424.49, w: 314.88, h: 123.09,
    slide: true, slideBottom: 1064 },  // slide from this box top → bottom of SHAP column

  // ── Column 3: Building a Model ──
  { key: '7', label: 'Model — Architecture',       x: 656.9,   y:  13.17, w: 303.1,  h: 517.07 },
  { key: '8', label: 'Model — Pipeline',           x: 659.04,  y: 525.25, w: 305.36, h: 302.73 },
  { key: '9', label: 'Model — Deployment',         x: 659.82,  y: 855.52, w: 304.58, h: 216.89 },

  // ── Column 4: Mapping the Impact ──
  { key: 'q', label: 'Policy — Timeline',          x: 967.81,  y:  22.17, w: 320.92, h: 418.13 },
  { key: 'w', label: 'Policy — Impact',            x: 967.81,  y: 440.3,  w: 314.81, h: 513.43 },

  // ── Column 5: Framework References ──
  { key: 'e', label: 'References',                 x: 1273.15, y:  13.17, w: 331.49, h: 260.45 },
];

const atlasEl  = document.getElementById('atlas');
const worldEl  = document.getElementById('world');
const atlasSel = d3.select(atlasEl);

let overviewBounds = { x: 0, y: 0, w: SVG_W, h: SVG_H };
let activeBm = null;

// Focus overlay: 4 fixed panels surrounding the active zoom box
const fps = ['fp-top', 'fp-bottom', 'fp-left', 'fp-right']
  .map(id => document.getElementById(id));

// ---- D3 zoom ----
const zoom = d3.zoom()
  .scaleExtent([0.04, 40])
  .on('zoom', event => {
    worldEl.setAttribute('transform', event.transform);
    updateFocusPanels(event.transform);
  });

atlasSel.call(zoom);
atlasSel.on('dblclick.zoom', null);

// ---- Load SVG ----
d3.xml(encodeURI('data visualization-01-01.svg'))
  .then(xmlDoc => {
    const src = xmlDoc.documentElement;
    Array.from(src.childNodes).forEach(node => worldEl.appendChild(document.adoptNode(node)));

    document.querySelector('.loading').classList.add('hidden');
    buildLegend();

    // Tight content bounds — exclude the solid background rect
    const layer1 = worldEl.querySelector('#Layer_1');
    if (layer1) layer1.style.display = 'none';
    try {
      const bb = worldEl.getBBox();
      if (bb.width > 0 && bb.height > 0)
        overviewBounds = { x: bb.x, y: bb.y, w: bb.width, h: bb.height };
    } catch (e) { /* fallback: full SVG dims */ }
    if (layer1) layer1.style.display = '';

    setTimeout(() => goBookmark(BOOKMARKS[0], false), 60);
  })
  .catch(err => {
    document.querySelector('.loading').textContent =
      `LOAD ERROR — run via a local server (python3 -m http.server 8000) · ${err.message}`;
  });

// ---- Camera ----
function fitRect(rx, ry, rw, rh, animate, padding = 0.92) {
  const vw = atlasEl.clientWidth;
  const vh = atlasEl.clientHeight;
  const k  = Math.min(vw / rw, vh / rh) * padding;
  const tx = vw / 2 - (rx + rw / 2) * k;
  const ty = vh / 2 - (ry + rh / 2) * k;
  const t  = d3.zoomIdentity.translate(tx, ty).scale(k);
  const sel = animate
    ? atlasSel.transition().duration(1100).ease(d3.easeCubicInOut)
    : atlasSel;
  sel.call(zoom.transform, t);
}

// Slide: fit column width, then pan top→bottom over the full section height
function runSlide(bm) {
  const vw = atlasEl.clientWidth;
  const vh = atlasEl.clientHeight;
  const k  = (vw / bm.w) * 0.92;
  const tx = vw / 2 - (bm.x + bm.w / 2) * k;
  const bottom = bm.slideBottom != null ? bm.slideBottom : bm.y + bm.h;

  // tyTop: top of zoom box sits at the very top of the screen
  // tyBot: bottom of full section sits at the very bottom
  const tyTop = -bm.y * k;
  const tyBot =  vh - bottom * k;

  const tStart = d3.zoomIdentity.translate(tx, tyTop).scale(k);
  const tEnd   = d3.zoomIdentity.translate(tx, tyBot).scale(k);

  // 1. Fly quickly to the top of the section
  atlasSel.transition().duration(900).ease(d3.easeCubicInOut)
    .call(zoom.transform, tStart)
    .on('end', () => {
      // 2. Glide smoothly to the bottom
      atlasSel.transition().duration(6000).ease(d3.easeLinear)
        .call(zoom.transform, tEnd);
    });
}

function goBookmark(bm, animate = true) {
  atlasSel.interrupt();
  activeBm = bm.x != null ? bm : null;

  if (!activeBm) {
    const o = overviewBounds;
    fitRect(o.x, o.y, o.w, o.h, animate, 1.0);
  } else if (bm.slide && animate) {
    runSlide(bm);
  } else {
    fitRect(bm.x, bm.y, bm.w, bm.h, animate);
  }
}

// ---- Focus blur overlay ----
function updateFocusPanels(t) {
  if (!activeBm || activeBm.x == null) {
    fps.forEach(p => { p.style.opacity = '0'; });
    return;
  }

  const vw = atlasEl.clientWidth;
  const vh = atlasEl.clientHeight;

  // Zoom box extents in screen space
  const sx = activeBm.x * t.k + t.x;
  const sy = activeBm.y * t.k + t.y;
  const sw = activeBm.w * t.k;
  const sh = activeBm.h * t.k;

  // Clamp to viewport
  const top   = Math.max(0, Math.min(sy, vh));
  const bot   = Math.max(0, Math.min(sy + sh, vh));
  const left  = Math.max(0, Math.min(sx, vw));
  const right = Math.max(0, Math.min(sx + sw, vw));
  const midH  = bot - top;

  // Top panel — above the box
  Object.assign(fps[0].style, { top: '0', left: '0', right: '0', bottom: '', width: '', height: top + 'px' });
  // Bottom panel — below the box
  Object.assign(fps[1].style, { top: bot + 'px', left: '0', right: '0', bottom: '0', width: '', height: '' });
  // Left panel — beside the box
  Object.assign(fps[2].style, { top: top + 'px', left: '0', right: '', bottom: '', width: left + 'px', height: midH + 'px' });
  // Right panel — beside the box
  Object.assign(fps[3].style, { top: top + 'px', left: right + 'px', right: '0', bottom: '', width: '', height: midH + 'px' });

  fps.forEach(p => { p.style.opacity = '1'; });
}

// ---- Keyboard ----
window.addEventListener('keydown', e => {
  const bm = BOOKMARKS.find(b => b.key === e.key);
  if (bm) { goBookmark(bm); return; }

  if (e.key === 'ArrowLeft')  atlasSel.transition().duration(220).call(zoom.translateBy,  80, 0);
  if (e.key === 'ArrowRight') atlasSel.transition().duration(220).call(zoom.translateBy, -80, 0);
  if (e.key === 'ArrowUp')    atlasSel.transition().duration(220).call(zoom.translateBy, 0,  80);
  if (e.key === 'ArrowDown')  atlasSel.transition().duration(220).call(zoom.translateBy, 0, -80);

  if (e.key === '=' || e.key === '+') atlasSel.transition().duration(260).call(zoom.scaleBy, 1.4);
  if (e.key === '-' || e.key === '_') atlasSel.transition().duration(260).call(zoom.scaleBy, 1 / 1.4);

  if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('recording');

  if (e.key === 'p' || e.key === 'P') {
    const t = d3.zoomTransform(atlasEl);
    console.log(`pos=${(-t.x).toFixed(2)},${(-t.y).toFixed(2)},${t.k.toFixed(4)}`);
  }
});

// ---- Legend ----
function buildLegend() {
  const panel = document.querySelector('.legend .panel');
  let html = '';
  BOOKMARKS.forEach(bm => {
    const tag = bm.slide ? ' <span style="opacity:0.5">↓ slide</span>' : '';
    html += `<div><span class="k">${bm.key}</span>${bm.label}${tag}</div>`;
  });
  html += `<div style="margin-top:8px;border-top:0.5px solid rgba(255,255,255,0.18);padding-top:6px;">`;
  html += `<div><span class="k">←↑↓→</span>pan</div>`;
  html += `<div><span class="k">+ −</span>zoom</div>`;
  html += `<div><span class="k">H</span>hide chrome (record)</div>`;
  html += `<div><span class="k">P</span>log position</div>`;
  html += `</div>`;
  panel.innerHTML = html;

  document.querySelector('.legend .toggle').addEventListener('click', () => {
    document.querySelector('.legend').classList.toggle('open');
  });
}
