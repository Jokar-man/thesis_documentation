/* ============================================================
   THESIS ATLAS · SVG edition
   Loads the static diagram, D3 zoom + keyboard bookmarks
   Bookmark regions extracted from <g id="Zooms"> in the SVG
   ============================================================ */

const SVG_W = 1920;
const SVG_H = 1080;

// Zoom targets derived from the Zooms layer bounding boxes.
// Update labels here to match your section titles.
const BOOKMARKS = [
  { key: '0', label: 'Overview' },
  { key: '1', label: 'Data — Context',         x:   17,     y:  13.17, w: 320.94, h:  320.94 },
  { key: '2', label: 'Data — Sources',          x:   17,     y: 334.11, w: 320.94, h:  738.38 },
  { key: '3', label: 'Analysis — Framework',    x:  342.02,  y:  13.17, w: 304.85, h:  411.32 },
  { key: '4', label: 'Analysis — Results',      x:  342.02,  y: 436.48, w: 314.88, h:  628.44 },
  { key: '5', label: 'Impact Model',            x:  656.9,   y:  13.17, w: 303.1,  h: 1051.74 },
  { key: '6', label: 'Policy Timeline',         x:  967.81,  y:  22.17, w: 320.92, h: 1057.83 },
  { key: '7', label: 'Output & Recommendations',x: 1273.15,  y:  13.17, w: 331.49, h: 1066.83 },
];

const atlasEl  = document.getElementById('atlas');
const worldEl  = document.getElementById('world');
const atlasSel = d3.select(atlasEl);
let currentBookmark = '0 · Overview';

// ---- D3 zoom ----
const zoom = d3.zoom()
  .scaleExtent([0.04, 40])
  .on('zoom', event => {
    worldEl.setAttribute('transform', event.transform);
    updateHUD(event.transform);
  });

atlasSel.call(zoom);
atlasSel.on('dblclick.zoom', null);

// ---- load SVG diagram ----
d3.xml(encodeURI('data visualization-01.svg'))
  .then(xmlDoc => {
    const src = xmlDoc.documentElement;          // <svg> from the file
    const children = Array.from(src.childNodes);
    children.forEach(node => worldEl.appendChild(document.adoptNode(node)));

    document.querySelector('.loading').classList.add('hidden');
    buildLegend();
    // initial view: fit the full diagram
    setTimeout(() => goBookmark(BOOKMARKS[0], false), 60);
  })
  .catch(err => {
    document.querySelector('.loading').textContent =
      `LOAD ERROR — run via a local server (python3 -m http.server 8000) · ${err.message}`;
  });

// ---- camera ----
function fitRect(rx, ry, rw, rh, animate) {
  const vw = atlasEl.clientWidth;
  const vh = atlasEl.clientHeight;
  const k  = Math.min(vw / rw, vh / rh) * 0.92;
  const tx = vw / 2 - (rx + rw / 2) * k;
  const ty = vh / 2 - (ry + rh / 2) * k;
  const t  = d3.zoomIdentity.translate(tx, ty).scale(k);
  const sel = animate
    ? atlasSel.transition().duration(1100).ease(d3.easeCubicInOut)
    : atlasSel;
  sel.call(zoom.transform, t);
}

function goBookmark(bm, animate = true) {
  currentBookmark = `${bm.key} · ${bm.label}`;
  document.querySelector('.hud .bookmark').textContent = currentBookmark;
  if (bm.x != null) {
    fitRect(bm.x, bm.y, bm.w, bm.h, animate);
  } else {
    fitRect(0, 0, SVG_W, SVG_H, animate);
  }
}

// ---- HUD ----
function updateHUD(t) {
  document.querySelector('.zoom-meter .k').textContent = `×${t.k.toFixed(2)}`;
  document.querySelector('.hud .coord').textContent =
    `${Math.round(-t.x)} , ${Math.round(-t.y)}`;
}

// ---- keyboard ----
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

// ---- legend ----
function buildLegend() {
  const panel = document.querySelector('.legend .panel');
  let html = '';
  BOOKMARKS.forEach(bm => {
    html += `<div><span class="k">${bm.key}</span>${bm.label}</div>`;
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
