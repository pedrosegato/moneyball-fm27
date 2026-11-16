import { poolFlags } from "../club";
import { PERCENTILE_PREFIX, SCORE_COLUMNS } from "../columnIds";
import { type Composite, evalComposite } from "../composites";
import { groupPercentiles } from "../percentiles";
import { STAT_KEYS, STATS, type StatKey } from "../stats/catalog";
import { keeperFlags } from "../universe";
import type { AnalysisInput, EngineSettings } from "./input";
import { byKey } from "./keyed";
import type { PreparedSnapshot } from "./prepare";

export interface DisplayAnalysis {
  pct: Record<StatKey, Float32Array>;
  reference: Record<StatKey, Float64Array>;
  composites: Record<string, Float32Array>;
  compositePct: Record<string, Float32Array>;
  ratingPct: Float32Array;
  pool: Uint8Array;
  poolMinutes: number;
}

export type DisplayInput = Pick<AnalysisInput, "composites"> & Pick<EngineSettings, "poolMinutes">;

function checkCompositeIds(prepared: PreparedSnapshot, composites: readonly Composite[]): void {
  const taken = new Set<string>([...Object.keys(prepared.columns), ...SCORE_COLUMNS]);
  for (const { id } of composites) {
    if (taken.has(id) || id.startsWith(PERCENTILE_PREFIX))
      throw new Error(`composite "${id}": the id is already a column`);
    taken.add(id);
  }
}

export function analyzeDisplay(prepared: PreparedSnapshot, { poolMinutes, composites }: DisplayInput): DisplayAnalysis {
  checkCompositeIds(prepared, composites);
  const { records, derived, result, sample } = prepared;
  const pool = poolFlags(records, poolMinutes);
  const references: Float64Array[] = [];
  const pct = byKey(STAT_KEYS, groupPercentiles(derived, STATS, pool, result.group, references));
  const isGk = keeperFlags(records);
  const values = composites.map((c) => evalComposite(c, result.cols, pct, isGk, sample));
  const [ratingPct, ...ranked] = groupPercentiles(
    [result.rating, ...values.map((v) => Float64Array.from(v))],
    [{}, ...composites.map(({ gkOnly }) => ({ gkOnly }))],
    pool,
    result.group,
  );
  const ids = composites.map((c) => c.id);
  return {
    pct,
    reference: byKey(STAT_KEYS, references),
    composites: byKey(ids, values),
    compositePct: byKey(ids, ranked),
    ratingPct,
    pool,
    poolMinutes,
  };
}
