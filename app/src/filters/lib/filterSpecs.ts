import type { DateRange } from "@/components/DateRangeFilter";
import type { NumberRange } from "@/components/RangeFilter";
import type { FilterSpec } from "@/engine/universe";
import type { DateBounds } from "@/lib/dates";
import type { DataBounds } from "@/lib/histogram";

const range = (col: string, min?: number, max?: number): FilterSpec => ({
  col,
  kind: "range",
  ...(min !== undefined && { min }),
  ...(max !== undefined && { max }),
});

export function rangeFilter(col: string, { min, max }: NumberRange, bounds: DataBounds): FilterSpec | null {
  const lo = min > bounds.lo ? min : undefined;
  const hi = max < bounds.hi ? max : undefined;
  return lo === undefined && hi === undefined ? null : range(col, lo, hi);
}

export function dateRangeFilter(col: string, { min, max }: DateRange, bounds: DateBounds): FilterSpec | null {
  const from = min > bounds.lo ? min : undefined;
  const to = max < bounds.hi ? max : undefined;
  if (from === undefined && to === undefined) return null;
  return { col, kind: "dateRange", ...(from !== undefined && { from }), ...(to !== undefined && { to }) };
}
