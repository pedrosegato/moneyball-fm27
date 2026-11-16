import type { StatDef } from "@/engine/stats/catalog";
import { formatStat } from "@/lib/format";

export function rowLeaders(values: readonly number[], def: Pick<StatDef, "lowerIsBetter" | "unit">): boolean[] {
  const present = values.filter((v) => !Number.isNaN(v));
  if (present.length < 2) return values.map(() => false);
  const best = formatStat(def.lowerIsBetter ? Math.min(...present) : Math.max(...present), def.unit);
  return values.map((v) => !Number.isNaN(v) && formatStat(v, def.unit) === best);
}
