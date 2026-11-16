export const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const isIsoDate = (v: unknown): v is string => typeof v === "string" && ISO_DATE.test(v);

export interface DateBounds {
  lo: string;
  hi: string;
}

export function dateBounds(values: readonly (string | null)[]): DateBounds | null {
  let lo: string | null = null;
  let hi: string | null = null;
  for (const raw of values) {
    if (!raw) continue;
    const v = raw.slice(0, 10);
    if (lo === null || v < lo) lo = v;
    if (hi === null || v > hi) hi = v;
  }
  return lo && hi ? { lo, hi } : null;
}
