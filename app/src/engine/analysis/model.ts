import { poolFlags } from "../club";
import { type PercentileColumns, shrinkSmallSamples } from "../composites";
import { STYLE_STATS } from "../data/groups";
import {
  clubLeagueStrength,
  DEFAULT_LEAGUE_WEIGHTING,
  LEAGUE_WEIGHTING,
  type LeagueWeighting,
  leagueFactors,
} from "../leagueStrength";
import { poolPercentiles } from "../percentiles";
import { POS_GROUPS, type PosGroup } from "../positions";
import { groupBest, type RoleScores, scoreRoles } from "../roles/score";
import { STAT_KEYS, STATS, statIndex } from "../stats/catalog";
import { keeperFlags } from "../universe";
import type { AnalysisInput, EngineSettings } from "./input";
import { byKey } from "./keyed";
import type { PreparedSnapshot } from "./prepare";
import { roleScoringInput } from "./roles";

export type ModelInput = Pick<AnalysisInput, "myClubUid"> &
  Pick<EngineSettings, "poolMinutes"> &
  Partial<Pick<EngineSettings, "leagueWeighting">>;

export interface RoleModel {
  pct: PercentileColumns;
  perfBase: Record<PosGroup, Float32Array>;
  shrunk: RoleScores;
  myLeagueStrength: number | null;
}

export interface ModelAnalysis extends Omit<RoleModel, "shrunk"> {
  perfIn: Record<PosGroup, Float32Array>;
  roles: RoleScores;
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

export function scoreModel(prepared: PreparedSnapshot, { poolMinutes, myClubUid }: ModelInput): RoleModel {
  const { records, leagues, sample } = prepared;
  const shrunkOf = new Map<Float32Array, Float32Array>();
  const shrunk = scoreRoles(roleScoringInput(prepared, poolMinutes)).map((scores) => {
    let out = shrunkOf.get(scores);
    if (!out) {
      out = shrinkSmallSamples(scores, sample);
      shrunkOf.set(scores, out);
    }
    return out;
  });
  return {
    pct: modelPercentiles(prepared, poolMinutes),
    perfBase: groupBest(shrunk),
    shrunk,
    myLeagueStrength: clubLeagueStrength(records, leagues, myClubUid),
  };
}

export function weighModel(
  prepared: PreparedSnapshot,
  { shrunk, ...model }: RoleModel,
  weighting: LeagueWeighting,
): ModelAnalysis {
  const factor = weighting === LEAGUE_WEIGHTING.none ? null : leagueFactors(prepared.result.leagueStrength);
  if (!factor) return { ...model, roles: shrunk, perfIn: groupBest(shrunk) };
  const weighted = new Map<Float32Array, Float32Array>();
  const roles = shrunk.map((scores) => {
    let out = weighted.get(scores);
    if (!out) {
      out = Float32Array.from(scores, (p, i) => p * factor[i]);
      weighted.set(scores, out);
    }
    return out;
  });
  return { ...model, roles, perfIn: groupBest(roles) };
}

export function analyzeModel(prepared: PreparedSnapshot, input: ModelInput): ModelAnalysis {
  return weighModel(prepared, scoreModel(prepared, input), input.leagueWeighting ?? DEFAULT_LEAGUE_WEIGHTING);
}
