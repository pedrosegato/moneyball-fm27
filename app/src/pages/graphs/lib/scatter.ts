import type { StatUnit } from "@/engine/stats/catalog";
import { type GraphAxesKey, VALUE_MODE, type ValueMode } from "@/store/ui";
import type { ChipColumn } from "@/table/columns/types";

export interface Axis {
  id: string;
  abbr: string;
  label: string;
  unit: StatUnit;
  lowerIsBetter: boolean;
  value: ArrayLike<number>;
  pct: ArrayLike<number>;
}

export interface AxisPair {
  x: string;
  y: string;
}

export const axisFrom = (column: ChipColumn): Axis => ({
  id: column.id,
  abbr: column.abbr,
  label: column.label,
  unit: column.def.unit,
  lowerIsBetter: !!column.def.lowerIsBetter,
  value: column.value,
  pct: column.pct,
});

export const plottedValues = (axis: Axis, mode: ValueMode): ArrayLike<number> =>
  mode === VALUE_MODE.percentile ? axis.pct : axis.value;

export const betterHigh = (axis: Axis, mode: ValueMode): boolean =>
  mode === VALUE_MODE.percentile || !axis.lowerIsBetter;

export const ANY_POSITION = "ALL" satisfies GraphAxesKey;

export const DEFAULT_AXES: Readonly<Record<GraphAxesKey, AxisPair>> = {
  GK: { x: "Saves/90", y: "xGP/90" },
  ZAG: { x: "Hdr%", y: "HdrWon/90" },
  LAT: { x: "Cr%", y: "CrA/90" },
  VOL: { x: "Int/90", y: "PossWon/90" },
  MC: { x: "Pas%", y: "PrPass/90" },
  MEI: { x: "KP/90", y: "xA/90" },
  PON: { x: "Drb/90", y: "xA/90" },
  ATA: { x: "npxG/90", y: "npG/90" },
  [ANY_POSITION]: { x: "npxG/90", y: "npG/90" },
};

export function axesFor(key: GraphAxesKey, saved: AxisPair | undefined, available: ReadonlySet<string>): AxisPair {
  return saved && available.has(saved.x) && available.has(saved.y) ? saved : DEFAULT_AXES[key];
}

export interface PointMasks {
  visible?: Uint8Array | null;
  pool?: Uint8Array | null;
}

export interface PointSet {
  rows: Uint32Array;
  x: Float64Array;
  y: Float64Array;
  inView: number;
}

export const NO_POINTS: PointSet = { rows: new Uint32Array(), x: new Float64Array(), y: new Float64Array(), inView: 0 };

export function pointSet(
  count: number,
  { visible, pool }: PointMasks,
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
): PointSet {
  const rows = new Uint32Array(count);
  const x = new Float64Array(count);
  const y = new Float64Array(count);
  let inView = 0;
  let n = 0;
  for (let i = 0; i < count; i++) {
    if ((visible && !visible[i]) || (pool && !pool[i])) continue;
    inView++;
    const a = xs[i];
    const b = ys[i];
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    rows[n] = i;
    x[n] = a;
    y[n] = b;
    n++;
  }
  return { rows: rows.subarray(0, n), x: x.subarray(0, n), y: y.subarray(0, n), inView };
}

export function mean(values: ArrayLike<number>): number {
  let sum = 0;
  for (let k = 0; k < values.length; k++) sum += values[k];
  return values.length ? sum / values.length : NaN;
}

export function selectedPoint(points: PointSet, uids: ArrayLike<number> | undefined, uid: number | null): number {
  if (uid === null || !uids) return -1;
  for (let k = 0; k < points.rows.length; k++) if (uids[points.rows[k]] === uid) return k;
  return -1;
}
