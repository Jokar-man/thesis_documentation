/* ============================================================
   THESIS ATLAS · script
   D3 zoom canvas · progressive disclosure · keyboard bookmarks
   ============================================================ */

const svg = d3.select('#atlas');
const root = svg.append('g').attr('class', 'root');

const gGrid    = root.append('g').attr('class', 'bg-grid');
const gFlows   = root.append('g').attr('class', 'flows');
const gBands   = root.append('g').attr('class', 'bands');

// ---------- world dimensions ----------
const W = 4800;
const BAND_H = 720;
const BAND_GAP = 180;
const MARGIN_TOP = 240;
const MARGIN_SIDE = 240;
const MODULE_GAP = 64;
const MODULE_H = 420;     // shorter modules — viewport-friendly at k≈2.4

// ---------- state ----------
let DATA = null;
let BOOKMARKS = null;
let nodeIndex = {};
let bandIndex = {};
let currentBookmark = '0 · Overview';

// ---------- load ----------
Promise.all([
  d3.json('data/structure.json'),
  d3.json('data/bookmarks.json')
]).then(([structure, bookmarks]) => {
  DATA = structure;
  BOOKMARKS = bookmarks.bookmarks;
  document.querySelector('.header .title').textContent = DATA.title;
  document.querySelector('.header .subtitle').textContent = DATA.subtitle;
  build();
  buildLegend();
  document.querySelector('.loading').classList.add('hidden');
  setTimeout(() => goBookmark(BOOKMARKS[0], false), 50);
});

// ============================================================
//  BUILD
// ============================================================
function build() {
  drawGrid();
  drawBands();
  drawFlows();
}

function drawGrid() {
  const step = 60;
  const totalH = MARGIN_TOP + DATA.bands.length * (BAND_H + BAND_GAP);
  for (let x = 0; x <= W; x += step) {
    gGrid.append('line').attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', totalH);
  }
  for (let y = 0; y <= totalH; y += step) {
    gGrid.append('line').attr('x1', 0).attr('x2', W).attr('y1', y).attr('y2', y);
  }
}

function drawBands() {
  DATA.bands.forEach((band, bi) => {
    const y0 = MARGIN_TOP + bi * (BAND_H + BAND_GAP);
    const bandG = gBands.append('g').attr('class', 'band').attr('id', `band_${band.id}`);

    // band frame
    bandG.append('rect').attr('class', 'band-frame')
      .attr('x', MARGIN_SIDE).attr('y', y0)
      .attr('width', W - 2 * MARGIN_SIDE).attr('height', BAND_H);

    // corner ticks
    const ck = 18;
    [
      [MARGIN_SIDE, y0],
      [W - MARGIN_SIDE, y0],
      [MARGIN_SIDE, y0 + BAND_H],
      [W - MARGIN_SIDE, y0 + BAND_H]
    ].forEach(([cx, cy], i) => {
      const dx = i % 2 === 0 ? ck : -ck;
      const dy = i < 2 ? ck : -ck;
      bandG.append('path').attr('class', 'corner-tick')
        .attr('d', `M${cx},${cy + dy} L${cx},${cy} L${cx + dx},${cy}`);
    });

    // band header
    bandG.append('text').attr('class', 'band-id')
      .attr('x', MARGIN_SIDE).attr('y', y0 - 70)
      .text(`BAND ${band.id} / ${String(DATA.bands.length).padStart(2,'0')}`);
    bandG.append('text').attr('class', 'band-title')
      .attr('x', MARGIN_SIDE).attr('y', y0 - 38).text(band.title);
    bandG.append('text').attr('class', 'band-subtitle')
      .attr('x', MARGIN_SIDE).attr('y', y0 - 16).text(band.subtitle);

    // tick marks along band top edge
    const innerW = W - 2 * MARGIN_SIDE;
    for (let i = 0; i <= 20; i++) {
      const tx = MARGIN_SIDE + (innerW * i / 20);
      const tlen = i % 5 === 0 ? 12 : 6;
      bandG.append('line').attr('class', 'band-tick')
        .attr('x1', tx).attr('x2', tx).attr('y1', y0).attr('y2', y0 + tlen);
    }

    // modules within band
    const n = band.modules.length;
    const innerPadding = 80;
    const usableW = innerW - 2 * innerPadding;
    const moduleW = (usableW - (n - 1) * MODULE_GAP) / n;
    const moduleY = y0 + (BAND_H - MODULE_H) / 2;

    band.modules.forEach((mod, mi) => {
      const mx = MARGIN_SIDE + innerPadding + mi * (moduleW + MODULE_GAP);
      drawModule(bandG, mod, mx, moduleY, moduleW, MODULE_H, band.id);
    });

    bandIndex[`band_${band.id}`] = {
      cx: W / 2,
      cy: y0 + BAND_H / 2 - 30,   // slight shift up to keep header in frame
      w: W,
      h: BAND_H + 220
    };
  });
}

function drawModule(parent, mod, x, y, w, h, bandId) {
  const g = parent.append('g')
    .attr('class', 'module-group')
    .attr('id', mod.id);

  // outer frame
  g.append('rect').attr('class', 'module-frame')
    .attr('x', x).attr('y', y).attr('width', w).attr('height', h);

  // header strip
  const HEADER_H = 64;
  g.append('rect').attr('class', 'module-frame')
    .attr('x', x).attr('y', y)
    .attr('width', w).attr('height', HEADER_H)
    .attr('opacity', 0.55);

  // id (tiny tag)
  g.append('text').attr('class', 'module-id')
    .attr('x', x + 9).attr('y', y + 12)
    .text(`${bandId}.${mod.id.toUpperCase().replace(/_/g,' ')}`.slice(0, 36));

  // title — inside header
  const titleLines = wrapText(mod.title, 22);
  titleLines.forEach((line, li) => {
    g.append('text').attr('class', 'module-title')
      .attr('x', x + 9).attr('y', y + 30 + li * 14)
      .text(line);
  });

  // summary — just below header
  const sumLines = wrapText(mod.summary, 38);
  sumLines.forEach((line, li) => {
    g.append('text').attr('class', 'module-summary')
      .attr('x', x + 9).attr('y', y + HEADER_H + 13 + li * 9)
      .text(line);
  });

  // detail block — fills remaining module space
  const detailStartOffset = HEADER_H + 12 + sumLines.length * 9 + 10;
  const dy = y + detailStartOffset;
  const dh = h - detailStartOffset - 8;
  const dx = x + 4;
  const dw = w - 8;

  g.append('rect').attr('class', 'module-detail-bg')
    .attr('x', dx).attr('y', dy).attr('width', dw).attr('height', dh)
    .attr('opacity', 0);

  g.append('text').attr('class', 'module-detail-line')
    .attr('x', dx + 6).attr('y', dy + 9)
    .attr('opacity', 0)
    .style('font-size', '4.2px')
    .style('letter-spacing', '0.28em')
    .text('— IMPLEMENTATION —');

  // detail bullets — adaptively sized so they fill the detail block
  const numDetails = mod.details.length;
  const availableH = dh - 30;
  const targetLineCount = numDetails * 1.4 + numDetails * 0.4;
  const lineH = Math.max(6.5, Math.min(11, availableH / Math.max(1, targetLineCount)));
  const detailFont = Math.max(4.6, lineH * 0.75);
  const bulletPad = lineH * 0.4;
  let curY = dy + 24;
  mod.details.forEach((d) => {
    g.append('rect').attr('class', 'module-detail-bullet')
      .attr('x', dx + 6).attr('y', curY - detailFont * 0.65)
      .attr('width', detailFont * 0.42).attr('height', detailFont * 0.42)
      .attr('opacity', 0);
    const wrapped = wrapText(d, 44);
    wrapped.forEach((line, li) => {
      g.append('text').attr('class', 'module-detail-line')
        .attr('x', dx + 13).attr('y', curY + li * lineH)
        .attr('opacity', 0)
        .style('font-size', detailFont + 'px')
        .text(line);
    });
    curY += wrapped.length * lineH + bulletPad;
  });

  g.on('click', (event) => {
    event.stopPropagation();
    flyToNode(mod.id, 2.4);
  });

  nodeIndex[mod.id] = {
    cx: x + w / 2, cy: y + h / 2,
    x, y, w, h,
    top: y, bottom: y + h,
    left: x, right: x + w,
    detailTop: dy, detailBottom: dy + dh,
    detailCy: dy + dh / 2
  };
}

function wrapText(text, maxChars) {
  if (!text) return [];
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const word of words) {
    if ((cur + ' ' + word).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = word;
    } else {
      cur = (cur + ' ' + word).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawFlows() {
  DATA.flows.forEach(flow => {
    const a = nodeIndex[flow.from];
    const b = nodeIndex[flow.to];
    if (!a || !b) return;
    const x1 = a.cx;
    const y1 = a.bottom;
    const x2 = b.cx;
    const y2 = b.top;
    const my = (y1 + y2) / 2;
    const d = `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
    gFlows.append('path').attr('class', 'flow-line').attr('d', d);
  });
}

// ============================================================
//  ZOOM
// ============================================================
const zoom = d3.zoom()
  .scaleExtent([0.12, 12])
  .on('zoom', (event) => {
    root.attr('transform', event.transform);
    updateZoomLOD(event.transform.k);
    updateHUD(event.transform);
  });

svg.call(zoom);
svg.on('dblclick.zoom', null);

function updateZoomLOD(k) {
  // Scale milestones:
  //   overview     k ≈ 0.16
  //   band view    k ≈ 0.34
  //   module view  k ≈ 1.0
  //   detail view  k ≈ 2.4

  const sumOp    = d3.scaleLinear().domain([0.5,  1.0]).range([0, 1]).clamp(true)(k);
  const titleOp  = d3.scaleLinear().domain([0.22, 0.5]).range([0.25, 1]).clamp(true)(k);
  const idOp     = d3.scaleLinear().domain([0.7,  1.4]).range([0, 1]).clamp(true)(k);
  const detailOp = d3.scaleLinear().domain([1.2,  1.8]).range([0, 1]).clamp(true)(k);
  const gridOp   = d3.scaleLinear().domain([0.25, 0.9]).range([1, 0]).clamp(true)(k);
  const bhOp     = d3.scaleLinear().domain([0.7,  1.6]).range([1, 0.15]).clamp(true)(k);
  const flowOp   = d3.scaleLinear().domain([1.0,  2.0]).range([0.32, 0.06]).clamp(true)(k);

  d3.selectAll('.module-summary').attr('opacity', sumOp);
  d3.selectAll('.module-title').attr('opacity', titleOp);
  d3.selectAll('.module-id').attr('opacity', idOp);
  d3.selectAll('.module-detail-bg').attr('opacity', detailOp * 0.96);
  d3.selectAll('.module-detail-line').attr('opacity', detailOp);
  d3.selectAll('.module-detail-bullet').attr('opacity', detailOp);
  gGrid.attr('opacity', gridOp);
  d3.selectAll('.band-id, .band-title, .band-subtitle').attr('opacity', bhOp);
  d3.selectAll('.flow-line').attr('opacity', flowOp);
}

function updateHUD(transform) {
  document.querySelector('.zoom-meter .k').textContent = `×${transform.k.toFixed(2)}`;
  document.querySelector('.hud .coord').textContent =
    `${Math.round(-transform.x)} , ${Math.round(-transform.y)}`;
  document.querySelector('.hud .bookmark').textContent = currentBookmark;
}

// ============================================================
//  CAMERA TRANSITIONS
// ============================================================
function flyTo(cx, cy, k, animate = true) {
  const { width, height } = svg.node().getBoundingClientRect();
  const tx = width / 2 - cx * k;
  const ty = height / 2 - cy * k;
  const t = d3.zoomIdentity.translate(tx, ty).scale(k);
  const target = animate ? svg.transition().duration(1100).ease(d3.easeCubicInOut) : svg;
  target.call(zoom.transform, t);
}

function flyToNode(id, k, animate = true) {
  const n = nodeIndex[id] || bandIndex[id];
  if (!n) return;
  let cx = n.cx, cy = n.cy;
  // For module deep zoom, frame the detail content (which is left-aligned).
  if (nodeIndex[id] && k >= 1.5) {
    if (n.detailCy != null) cy = n.detailCy;
    // If module is wider than the visible slice, shift cx toward the content edge
    const { width } = svg.node().getBoundingClientRect();
    const visibleW = width / k;
    if (n.w > visibleW) {
      // place left edge of viewport ~10px world-coords left of content start
      // content starts at module.left + 17 (dx+13 for text + 4 for padding)
      cx = n.left + 7 + visibleW / 2;
    }
  }
  flyTo(cx, cy, k, animate);
}

function goBookmark(bm, animate = true) {
  currentBookmark = `${bm.key} · ${bm.label}`;
  if (bm.target) {
    flyToNode(bm.target, bm.k, animate);
  } else {
    // overview — fit world
    const { width, height } = svg.node().getBoundingClientRect();
    const totalH = MARGIN_TOP + DATA.bands.length * (BAND_H + BAND_GAP);
    const kx = width / W;
    const ky = height / totalH;
    const k = Math.min(kx, ky) * 0.92;
    flyTo(W / 2, totalH / 2, k, animate);
  }
}

// ============================================================
//  KEYBOARD
// ============================================================
window.addEventListener('keydown', (e) => {
  const bm = BOOKMARKS && BOOKMARKS.find(b => b.key === e.key);
  if (bm) { goBookmark(bm); return; }

  const PAN = 80;
  if (e.key === 'ArrowLeft')  panBy( PAN, 0);
  if (e.key === 'ArrowRight') panBy(-PAN, 0);
  if (e.key === 'ArrowUp')    panBy(0,  PAN);
  if (e.key === 'ArrowDown')  panBy(0, -PAN);

  if (e.key === '=' || e.key === '+') zoomBy(1.4);
  if (e.key === '-' || e.key === '_') zoomBy(1 / 1.4);

  if (e.key === 'h' || e.key === 'H') {
    document.body.classList.toggle('recording');
  }
  if (e.key === 'p' || e.key === 'P') {
    const t = d3.zoomTransform(svg.node());
    console.log(`current: x=${t.x.toFixed(1)} y=${t.y.toFixed(1)} k=${t.k.toFixed(3)}`);
  }
});

function panBy(dx, dy) {
  svg.transition().duration(220).call(zoom.translateBy, dx, dy);
}
function zoomBy(factor) {
  svg.transition().duration(260).call(zoom.scaleBy, factor);
}

// ============================================================
//  LEGEND PANEL
// ============================================================
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
  html += `<div><span class="k">P</span>log transform</div>`;
  html += `</div>`;
  panel.innerHTML = html;

  document.querySelector('.legend .toggle').addEventListener('click', () => {
    document.querySelector('.legend').classList.toggle('open');
  });
}
