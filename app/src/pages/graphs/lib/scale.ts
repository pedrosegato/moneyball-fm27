import { VALUE_MODE, type ValueMode } from "@/store/ui";

export function niceTicks(lo: number, hi: number, count = 5): number[] {
  if (!(hi > lo)) return Number.isFinite(lo) ? [lo] : [];
  const raw = (hi - lo) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const f = raw / magnitude;
  const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * magnitude;
  const out: number[] = [];
  for (let k = Math.ceil(lo / step); k * step <= hi + step * 1e-9; k++) out.push(Number((k * step).toFixed(10)) || 0);
  return out;
}

export function tickStep(ticks: readonly number[]): number {
  return ticks.length > 1 ? ticks[1] - ticks[0] : 1;
}

export function paddedExtent(values: ArrayLike<number>, pad = 0.07): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (let k = 0; k < values.length; k++) {
    const v = values[k];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!Number.isFinite(lo)) return [0, 1];
  if (lo === hi) return [lo - 1, hi + 1];
  const air = (hi - lo) * pad;
  return [lo - air, hi + air];
}

const PERCENT_TICKS = [0, 25, 50, 75, 100];
const PERCENT_STEP = 25;
const PERCENT_DOMAIN: [number, number] = [-4, 104];

export interface Scale {
  at(v: number): number;
  ticks: number[];
  step: number;
}

export function scaleOf(
  values: ArrayLike<number>,
  high: boolean,
  mode: ValueMode,
  start: number,
  length: number,
  vertical: boolean,
): Scale {
  const percentile = mode === VALUE_MODE.percentile;
  const [d0, d1] = percentile ? PERCENT_DOMAIN : paddedExtent(values);
  const ticks = percentile ? PERCENT_TICKS : niceTicks(d0, d1);
  const span = d1 - d0;
  const at = (v: number) => {
    const t = high ? (v - d0) / span : (d1 - v) / span;
    return vertical ? start + (1 - t) * length : start + t * length;
  };
  return { at, ticks, step: percentile ? PERCENT_STEP : tickStep(ticks) };
}
