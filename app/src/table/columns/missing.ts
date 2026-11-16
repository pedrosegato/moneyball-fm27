import type { MissingReason } from "@/components/missing";
import type { StatDef } from "@/engine/stats/catalog";

export type Reason = (i: number) => MissingReason | undefined;

export interface Sample {
  values: ArrayLike<number>;
  min: number;
}

export function statSamples(
  def: StatDef,
  cols: Readonly<Record<string, ArrayLike<number>>>,
  minutes: ArrayLike<number>,
): Sample[] {
  return (def.minSample ?? []).map((m) => ({ values: m.of === "minutes" ? minutes : cols[m.of], min: m.min }));
}

export function missingReason(
  i: number,
  value: ArrayLike<number>,
  pct: ArrayLike<number>,
  samples: readonly Sample[],
  pool: ArrayLike<number>,
): MissingReason | undefined {
  if (!Number.isNaN(pct[i])) return undefined;
  if (!Number.isNaN(value[i])) return pool[i] ? "group" : "pool";
  const belowSample =
    samples.length > 0 && samples.every((s) => !Number.isNaN(s.values[i])) && samples.some((s) => s.values[i] < s.min);
  return belowSample ? "sample" : undefined;
}
