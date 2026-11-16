import { poolFlags } from "../club";
import { type PercentileColumns, shrinkSmallSamples } from "../composites";
import { STYLE_STATS } from "../data/groups";
import { adjustedPerformance, clubLeagueStrength, leagueCoefficient } from "../leagueStrength";
import { percentiles, poolPercentiles } from "../percentiles";
import { POS_GROUPS, type PosGroup } from "../positions";
import { ROLES } from "../roles/catalog";
import { groupBest, type RoleScores, rulerFor, scoreRoles } from "../roles/score";
import { STAT_KEYS, STATS, statIndex } from "../stats/catalog";
import { keeperFlags } from "../universe";
import type { AnalysisInput, EngineSettings } from "./input";
import { byKey } from "./keyed";
import type { PreparedSnapshot } from "./prepare";
import { roleScoringInput } from "./roles";

export type ModelInput = Pick<AnalysisInput, "myClubUid"> & Pick<EngineSettings, "poolMinutes" | "leagueAdjustment">;

export interface ModelAnalysis {
  pct: PercentileColumns;
  perfBase: Record<PosGroup, Float32Array>;
  perfIn: Record<PosGroup, Float32Array>;
  roles: RoleScores;
  leagueCoefficient: number;
  myLeagueStrength: number | null;
}

export function modelPercentiles(prepared: PreparedSnapshot, poolMinutes: number): PercentileColumns {
  const used = new Set(POS_GROUPS.flatMap((g) => STYLE_STATS[g]));
  const keys = STAT_KEYS.filter((key) => used.has(key));
  const stats = keys.map(statIndex);
  const { records, derived } = prepared;
  const cols = stats.map((j) => derived[j]);
  const pool = poolFlags(records, poolMinutes);
  return byKey(
    keys,
    poolPercentiles(
      cols,
      stats.map((j) => STATS[j]),
      pool,
      keeperFlags(records),
    ),
  );
}

function rankedAmong(values: Float32Array, ruler: Uint8Array): Float32Array {
  return percentiles([Float64Array.from(values)], ruler, [{}], new Uint8Array(values.length), { sides: 1 })[0];
}

export function analyzeModel(
  prepared: PreparedSnapshot,
  { poolMinutes, leagueAdjustment, myClubUid }: ModelInput,
): ModelAnalysis {
  const { records, groups, leagues, sample } = prepared;
  const pct = modelPercentiles(prepared, poolMinutes);
  const input = roleScoringInput(prepared, poolMinutes);
  const raw = scoreRoles(input);
  const unshrunk = groupBest(raw);
  const strength = prepared.result.leagueStrength;
  const coefficient = leagueCoefficient(records, unshrunk, strength, groups, { poolMinutes });
  const myLeagueStrength = clubLeagueStrength(records, leagues, myClubUid);
  const coef = leagueAdjustment * coefficient;
  const mine = myLeagueStrength ?? Number.NaN;
  const reranks = coef !== 0 && myLeagueStrength !== null;
  const finished = new Map<Float32Array, Float32Array>();
  const roles = raw.map((scores, k) => {
    let out = finished.get(scores);
    if (!out) {
      const adjusted = Float32Array.from(shrinkSmallSamples(scores, sample), (p, i) =>
        adjustedPerformance(p, strength[i], mine, coef),
      );
      out = reranks ? rankedAmong(adjusted, rulerFor(ROLES[k], input.groups, input.pool)) : adjusted;
      finished.set(scores, out);
    }
    return out;
  });
  const perfBase = byKey(
    POS_GROUPS,
    POS_GROUPS.map((g) => shrinkSmallSamples(unshrunk[g], sample)),
  ) as Record<PosGroup, Float32Array>;
  const perfIn = groupBest(roles);
  return { pct, perfBase, perfIn, roles, leagueCoefficient: coefficient, myLeagueStrength };
}
