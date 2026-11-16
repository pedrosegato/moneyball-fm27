import { POOL_HIDDEN_COLUMNS, percentileColumn, RATING_PERCENTILE, type SCORE_COLUMNS } from "../columnIds";
import type { CellValue, Columns } from "../universe";
import type { DisplayAnalysis } from "./display";
import { withNumbers } from "./keyed";
import type { PreparedSnapshot } from "./prepare";
import type { RoleAnalysis } from "./roles";
import type { ScoreAnalysis } from "./score";

const percentilesOf = (cols: Record<string, Float32Array>) =>
  Object.fromEntries(Object.entries(cols).map(([key, values]) => [percentileColumn(key), values]));

export function analysisColumns(
  prepared: PreparedSnapshot,
  analysis: DisplayAnalysis & ScoreAnalysis & RoleAnalysis,
): Columns {
  const { rolePerf, fair, rank, abilityPct, valueRatio, statsVsAbility, pool } = analysis;
  const columns = withNumbers(prepared.columns, {
    ...percentilesOf(analysis.pct),
    ...analysis.composites,
    ...percentilesOf(analysis.compositePct),
    [RATING_PERCENTILE]: analysis.ratingPct,
    ...({ perf: rolePerf, fair, rank, abilityPct, valueRatio, statsVsAbility } satisfies Record<
      (typeof SCORE_COLUMNS)[number],
      ArrayLike<number>
    >),
  });
  const all: Record<string, (i: number) => CellValue> = { ...columns };
  for (const id of POOL_HIDDEN_COLUMNS) {
    const get = all[id];
    if (!get) throw new Error(`column "${id}" is hidden under the pool, but there is no such column`);
    all[id] = (i) => (pool[i] ? get(i) : NaN);
  }
  return all;
}
