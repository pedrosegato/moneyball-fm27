export interface DataBounds {
  lo: number;
  hi: number;
  count: number;
}

export function dataBounds(values: Float64Array): DataBounds | null {
  let lo = Infinity;
  let hi = -Infinity;
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (Number.isNaN(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
    count++;
  }
  return count ? { lo, hi, count } : null;
}

export function histogram(values: Float64Array, lo: number, hi: number, bins: number): number[] {
  const counts = new Array<number>(bins).fill(0);
  const width = (hi - lo) / bins;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (Number.isNaN(v) || v < lo || v > hi) continue;
    const b = width > 0 ? Math.min(bins - 1, Math.floor((v - lo) / width)) : 0;
    counts[b]++;
  }
  return counts;
}

export function countInRange(values: Float64Array, min: number, max: number): number {
  let n = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v >= min && v <= max) n++;
  }
  return n;
}
