import { GK_INDEX, POS_GROUPS } from "./positions";
import type { StatDef } from "./stats/catalog";

export const REFMIN = 20;

export type PercentileDef = Pick<StatDef, "lowerIsBetter" | "gkOnly">;

export interface PercentileOptions {
  sides: number;
  keeperSide?: number;
  references?: Float64Array[];
  outsiders?: "placed" | "blank";
}

export function quantile(sorted: ArrayLike<number>, q: number): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  const at = (n - 1) * q;
  const lo = Math.floor(at);
  const hi = Math.min(n - 1, lo + 1);
  return sorted[lo] + (at - lo) * (sorted[hi] - sorted[lo]);
}

export const TOP_SHARE = 0.05;

export interface Reference {
  median: number;
  top: number;
}

export function referenceOf(
  reference: Readonly<Record<string, ArrayLike<number>>> | undefined,
  stat: string,
  side: number,
): Reference {
  const slots = reference?.[stat];
  return { median: slots?.[2 * side] ?? NaN, top: slots?.[2 * side + 1] ?? NaN };
}

export function rankPercentile(below: number, equal: number, n: number): number {
  return Math.floor((100 * (below + (equal + 1) / 2)) / (n + 1));
}

function lowerBound(sorted: Float64Array, v: number, lo: number, hi: number): number {
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBound(sorted: Float64Array, v: number, lo: number, hi: number): number {
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] <= v) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

interface Ranking {
  col: Float64Array;
  population: Uint8Array;
  side: Uint8Array;
  sides: number;
  against: number;
  invert: boolean;
  blankOutsiders: boolean;
  scratch: Float64Array;
  start: Int32Array;
  out: Float32Array;
  reference: Float64Array | null;
}

const isMember = (population: Uint8Array, side: Uint8Array, against: number, i: number) =>
  population[i] !== 0 && (against < 0 || side[i] === against);

function sortSides({ col, population, side, sides, against, scratch, start }: Ranking): void {
  const n = col.length;
  start.fill(0);
  for (let i = 0; i < n; i++) if (isMember(population, side, against, i) && !Number.isNaN(col[i])) start[side[i] + 1]++;
  for (let s = 0; s < sides; s++) start[s + 1] += start[s];
  const next = start.slice(0, sides);
  for (let i = 0; i < n; i++) {
    if (isMember(population, side, against, i) && !Number.isNaN(col[i])) scratch[next[side[i]]++] = col[i];
  }
  for (let s = 0; s < sides; s++) {
    if (start[s + 1] - start[s] >= REFMIN) scratch.subarray(start[s], start[s + 1]).sort();
  }
}

function writeReferences({ reference, scratch, start, sides, against, invert }: Ranking): void {
  if (!reference) return;
  for (let s = 0; s < sides; s++) {
    const sorted = scratch.subarray(start[s], start[s + 1]);
    if (sorted.length < REFMIN) continue;
    reference[2 * s] = quantile(sorted, 0.5);
    reference[2 * s + 1] = quantile(sorted, invert ? TOP_SHARE : 1 - TOP_SHARE);
  }
  if (against >= 0) for (let s = 0; s < sides; s++) reference.copyWithin(2 * s, 2 * against, 2 * against + 2);
}

function rankSides(ranking: Ranking): void {
  const { col, population, side, against, invert, blankOutsiders, scratch, start, out } = ranking;
  sortSides(ranking);
  writeReferences(ranking);
  for (let i = 0; i < col.length; i++) {
    const v = col[i];
    if (Number.isNaN(v)) continue;
    const s = against < 0 ? side[i] : against;
    const lo = start[s];
    const hi = start[s + 1];
    if (hi - lo < REFMIN) continue;
    const inside = isMember(population, side, against, i);
    if (!inside && blankOutsiders) continue;
    const below = lowerBound(scratch, v, lo, hi);
    const equal = upperBound(scratch, v, below, hi) - below + (inside ? 0 : 1);
    const p = rankPercentile(below - lo, equal, hi - lo);
    out[i] = invert ? Math.min(100, Math.max(0, 100 - p)) : p;
  }
}

export function percentiles(
  cols: readonly Float64Array[],
  population: Uint8Array,
  defs: readonly PercentileDef[],
  side: Uint8Array,
  { sides, keeperSide, references, outsiders = "placed" }: PercentileOptions,
): Float32Array[] {
  if (cols.length !== defs.length) throw new Error(`percentiles: ${cols.length} columns for ${defs.length} stats`);
  const n = population.length;
  if (side.length !== n || cols.some((c) => c.length !== n)) {
    throw new Error("percentiles: columns, population and sides differ in length");
  }
  if (side.some((s) => s >= sides)) throw new Error(`percentiles: a side outside the ${sides} counted`);
  if (keeperSide === undefined && defs.some((d) => d.gkOnly)) {
    throw new Error("percentiles: a gkOnly stat needs a keeper side");
  }
  if (keeperSide !== undefined && !(Number.isInteger(keeperSide) && keeperSide >= 0 && keeperSide < sides)) {
    throw new Error(`percentiles: keeper side ${keeperSide} is not one of the ${sides} sides`);
  }
  const scratch = new Float64Array(n);
  const start = new Int32Array(sides + 1);
  return cols.map((col, j) => {
    const out = new Float32Array(n).fill(NaN);
    let reference: Float64Array | null = null;
    if (references) {
      reference = new Float64Array(2 * sides).fill(NaN);
      references[j] = reference;
    }
    const { lowerIsBetter, gkOnly } = defs[j];
    rankSides({
      col,
      population,
      side,
      sides,
      against: gkOnly && keeperSide !== undefined ? keeperSide : -1,
      invert: !!lowerIsBetter,
      blankOutsiders: outsiders === "blank",
      scratch,
      start,
      out,
      reference,
    });
    return out;
  });
}

export function groupPercentiles(
  cols: readonly Float64Array[],
  defs: readonly PercentileDef[],
  pool: Uint8Array,
  group: Uint8Array,
  references?: Float64Array[],
): Float32Array[] {
  return percentiles(cols, pool, defs, group, {
    sides: POS_GROUPS.length,
    keeperSide: GK_INDEX,
    references,
    outsiders: "blank",
  });
}

export function poolPercentiles(
  cols: readonly Float64Array[],
  defs: readonly PercentileDef[],
  pool: Uint8Array,
  isGk: Uint8Array,
): Float32Array[] {
  return percentiles(cols, pool, defs, isGk, { sides: 2, keeperSide: 1 });
}
