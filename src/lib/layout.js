// Page geometry and montage layouts. All dimensions are in pixels at LAYOUT_DPI.
export const LAYOUT_DPI = 300;

export const PAPERS = {
  A4: [297, 210],
  A3: [420, 297],
  Letter: [279.4, 215.9],
  Square: [210, 210],
  Slide: [338.7, 190.5],
};

export function page(o) {
  const mm = LAYOUT_DPI / 25.4;
  let [w, h] = PAPERS[o.paper] || PAPERS.A4;
  if (o.orient === "P") [w, h] = [h, w];
  return { W: w * mm, H: h * mm, M: o.mar * mm, G: o.gap * mm, R: o.radius * mm };
}

const shapeScore = (cw, ch) => {
  const a = cw / ch;
  return cw * ch * Math.min(a / 1.5, 1.5 / a);
};

function gridLayout(n, { W, H, M, G }, fixed) {
  let best = null;
  for (let cols = fixed || 1; cols <= (fixed || n); cols++) {
    const rows = Math.ceil(n / cols);
    const cw = (W - 2 * M - (cols - 1) * G) / cols;
    const ch = (H - 2 * M - (rows - 1) * G) / rows;
    const score = shapeScore(cw, ch);
    if (!best || score > best.score) best = { cols, rows, cw, ch, score };
  }
  const { cols, rows, cw, ch } = best;
  return [...Array(n)].map((_, i) => {
    const r = Math.floor(i / cols),
      c = i % cols;
    const inRow = r === rows - 1 ? n - r * cols : cols;
    const offset = ((cols - inRow) * (cw + G)) / 2; // centre an incomplete last row
    return { x: M + offset + c * (cw + G), y: M + r * (ch + G), w: cw, h: ch };
  });
}

// First photo takes a 2x2 block, the others fill the remaining cells
function featuredLayout(n, p, fixed) {
  const { W, H, M, G } = p;
  if (n < 3) return gridLayout(n, p, fixed);
  let best = null;
  for (let cols = Math.max(fixed || 2, 2); cols <= (fixed || n + 3); cols++) {
    const rows = Math.max(2, Math.ceil((n + 3) / cols));
    const cw = (W - 2 * M - (cols - 1) * G) / cols;
    const ch = (H - 2 * M - (rows - 1) * G) / rows;
    const score = (shapeScore(cw, ch) * (n + 3)) / (cols * rows); // penalise empty cells
    if (!best || score > best.score) best = { cols, rows, cw, ch, score };
  }
  const { cols, rows, cw, ch } = best;
  const cell = (r, c, sr = 1, sc = 1) => ({
    x: M + c * (cw + G),
    y: M + r * (ch + G),
    w: sc * cw + (sc - 1) * G,
    h: sr * ch + (sr - 1) * G,
  });
  const rects = [cell(0, 0, 2, 2)];
  for (let r = 0; r < rows && rects.length < n; r++) {
    for (let c = 0; c < cols && rects.length < n; c++) if (!(r < 2 && c < 2)) rects.push(cell(r, c));
  }
  return rects;
}

// Rows of uncropped photos, each row stretched to the full width (like Flickr / Google Photos)
function justifiedLayout(aspects, { W, H, M, G }, fixed) {
  const n = aspects.length;
  const iw = W - 2 * M,
    ih = H - 2 * M;
  const total = aspects.reduce((a, b) => a + b, 0);
  const maxRows = fixed ? Math.ceil(n / fixed) : n;
  let best = null;
  for (let r = fixed ? maxRows : 1; r <= maxRows; r++) {
    // greedy split into r rows of similar total aspect
    const rows = [];
    let cur = [],
      acc = 0;
    aspects.forEach((a, i) => {
      if (cur.length && acc + a / 2 > (total / r) * (rows.length + 1) && rows.length < r - 1) {
        rows.push(cur);
        cur = [];
      }
      cur.push(i);
      acc += a;
    });
    rows.push(cur);
    const heights = rows.map(
      (row) => (iw - (row.length - 1) * G) / row.reduce((s, i) => s + aspects[i], 0),
    );
    const h = heights.reduce((a, b) => a + b, 0) + (rows.length - 1) * G;
    // keep the option that covers the largest part of the page once scaled to fit
    const f = h > ih ? (ih - (rows.length - 1) * G) / (h - (rows.length - 1) * G) : 1;
    const area = rows.reduce(
      (s, row, k) => s + row.reduce((a, i) => a + aspects[i], 0) * (heights[k] * f) ** 2,
      0,
    );
    if (!best || area > best.area) best = { rows, heights, h, area };
  }
  const { rows, heights, h } = best;
  const f = h > ih ? (ih - (rows.length - 1) * G) / (h - (rows.length - 1) * G) : 1;
  const used = heights.reduce((a, b) => a + b * f, 0) + (rows.length - 1) * G;
  let y = M + (ih - used) / 2;
  const rects = [];
  rows.forEach((row, k) => {
    const rh = heights[k] * f;
    const rw = row.reduce((s, i) => s + aspects[i] * rh, 0) + (row.length - 1) * G;
    let x = M + (iw - rw) / 2;
    row.forEach((i) => {
      const w = aspects[i] * rh;
      rects[i] = { x, y, w, h: rh };
      x += w + G;
    });
    y += rh + G;
  });
  return rects;
}

export function layout(tiles, o) {
  if (!tiles.length) return [];
  const p = page(o);
  const fixed = Number(o.cols) || 0;
  if (o.layout === "justified") return justifiedLayout(tiles.map((t) => t.photo.aspect), p, fixed);
  if (o.layout === "featured") return featuredLayout(tiles.length, p, fixed);
  return gridLayout(tiles.length, p, fixed);
}
