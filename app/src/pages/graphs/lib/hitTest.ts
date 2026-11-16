export interface HitGrid {
  px: Float32Array;
  py: Float32Array;
  cell: number;
  cols: number;
  rows: number;
  start: Uint32Array;
  order: Uint32Array;
}

export function hitGrid(px: Float32Array, py: Float32Array, cell: number): HitGrid {
  let maxX = 0;
  let maxY = 0;
  for (let k = 0; k < px.length; k++) {
    if (px[k] > maxX) maxX = px[k];
    if (py[k] > maxY) maxY = py[k];
  }
  const cols = Math.floor(maxX / cell) + 1;
  const rows = Math.floor(maxY / cell) + 1;
  const cellOf = new Uint32Array(px.length);
  const start = new Uint32Array(cols * rows + 1);
  for (let k = 0; k < px.length; k++) {
    const c = Math.floor(Math.max(0, py[k]) / cell) * cols + Math.floor(Math.max(0, px[k]) / cell);
    cellOf[k] = c;
    start[c + 1]++;
  }
  for (let c = 0; c < cols * rows; c++) start[c + 1] += start[c];
  const fill = start.slice(0, cols * rows);
  const order = new Uint32Array(px.length);
  for (let k = 0; k < px.length; k++) order[fill[cellOf[k]]++] = k;
  return { px, py, cell, cols, rows, start, order };
}

export function nearestPoint(grid: HitGrid, x: number, y: number, radius: number): number {
  const { px, py, cell, cols, rows, start, order } = grid;
  const reach = Math.ceil(radius / cell);
  const cx = Math.floor(x / cell);
  const cy = Math.floor(y / cell);
  let best = -1;
  let bestD = radius * radius;
  for (let gy = Math.max(0, cy - reach); gy <= Math.min(rows - 1, cy + reach); gy++) {
    for (let gx = Math.max(0, cx - reach); gx <= Math.min(cols - 1, cx + reach); gx++) {
      const c = gy * cols + gx;
      for (let s = start[c]; s < start[c + 1]; s++) {
        const k = order[s];
        const d = (px[k] - x) ** 2 + (py[k] - y) ** 2;
        if (d < bestD || (d === bestD && (best === -1 || k < best))) {
          best = k;
          bestD = d;
        }
      }
    }
  }
  return best;
}
