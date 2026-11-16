import type { DataBounds } from "@/lib/histogram";

export const BINS = 24;

export function sliderScale(spread: DataBounds, bounds: DataBounds, min?: number, max?: number): DataBounds {
  const set = [min, max].filter((v): v is number => v != null && !Number.isNaN(v));
  return {
    lo: set.some((v) => v < spread.lo) ? bounds.lo : spread.lo,
    hi: set.some((v) => v > spread.hi) ? bounds.hi : spread.hi,
    count: spread.count,
  };
}

function allIntegers(values: Float64Array) {
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!Number.isNaN(v) && !Number.isInteger(v)) return false;
  }
  return true;
}

export function precisionFor(values: Float64Array, { lo, hi }: DataBounds) {
  if (allIntegers(values)) return { step: 1, decimals: 0 };
  const exp = hi > lo ? Math.floor(Math.log10(hi - lo)) - 2 : -2;
  return { step: 10 ** exp, decimals: Math.max(0, -exp) };
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
