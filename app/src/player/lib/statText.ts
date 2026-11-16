import type { StatDef } from "@/engine/stats/catalog";
import { EMPTY_VALUE } from "@/lib/constants";
import { formatStat } from "@/lib/format";

export const statText = (line: { def: Pick<StatDef, "unit"> }, value: number): string =>
  Number.isNaN(value) ? EMPTY_VALUE : formatStat(value, line.def.unit);
