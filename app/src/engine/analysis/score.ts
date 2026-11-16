import { abilityPercentiles } from "../ability";
import { marketValue, poolFlags } from "../club";
import type { PerformancePool } from "../composites";
import { STYLE_STATS } from "../data/groups";
import { fairValues, fitValueModel } from "../fairValue";
import { moneyballList } from "../moneyball";
import { type PosGroup, slotGroup } from "../positions";
import { rankScores } from "../rank";
import { isRoleId, roleIndex } from "../roles/catalog";
import { contractedSquad, sellKeep, type Verdict } from "../sellKeep";
import { type FitRow, fitContext, type Lineup, pickLineup, tacticalFit } from "../tacticalFit";
import type { AnalysisInput } from "./input";
import type { ModelAnalysis } from "./model";
import type { PreparedSnapshot } from "./prepare";

export interface ScoreAnalysis {
  perf: Float32Array;
  perfUnadjusted: Float32Array;
  perfIn: Record<PosGroup, Float32Array>;
  myLeagueStrength: number | null;
  abilityPct: Float32Array;
  fair: Float64Array;
  valueRatio: Float64Array;
  statsVsAbility: Float32Array;
  moneyball: Uint32Array;
  lineup: Lineup;
  fit: FitRow[][];
  sellKeep: Record<number, Verdict>;
  rank: Float64Array;
}

export type ScoreInput = Pick<AnalysisInput, "myClubUid" | "settings" | "lineup">;

export function scorePlayers(
  prepared: PreparedSnapshot,
  model: ModelAnalysis,
  { myClubUid, settings, lineup = {} }: ScoreInput,
): ScoreAnalysis {
  const { records, groups, positions, date } = prepared;
  const { poolMinutes } = settings;
  const { pct: modelPct, perfBase, perfIn, roles, myLeagueStrength } = model;
  const pool = poolFlags(records, poolMinutes);
  const ranked: PerformancePool = { groups, pool };

  const perf = Float32Array.from(groups, (g, i) => perfIn[g][i]);
  const perfUnadjusted = Float32Array.from(groups, (g, i) => perfBase[g][i]);
  const valueModel = fitValueModel(records, perf, groups, { ...settings.fairValue, poolMinutes });
  const fair = fairValues(valueModel, records, perf, groups);
  const moneyball = Uint32Array.from(
    moneyballList({ records, groups, perf }, fair, { ...settings.moneyball, poolMinutes, excludeClubUid: myClubUid }),
  );

  const xi = pickLineup(records, positions, myClubUid, lineup.formation, lineup);
  let fit: FitRow[][] = xi.slots.map(() => []);
  let verdicts = new Map<number, Verdict>();
  if (myClubUid !== null) {
    const ctx = fitContext({ records, positions, pct: modelPct, keyStats: STYLE_STATS, slotGroup, clubUid: myClubUid });
    const fitOptions = { ...settings.fit, poolMinutes };
    fit = xi.slots.map((pos, s) => {
      const group = slotGroup(pos);
      const role = lineup.roles?.[s];
      const slotPerf = group && role && isRoleId(role) ? { ...perfIn, [group]: roles[roleIndex(role)] } : perfIn;
      return tacticalFit({ pos, mine: xi.xi[s] }, ctx, slotPerf, fitOptions);
    });
    verdicts = sellKeep(
      contractedSquad(records, myClubUid),
      { records, groups, positions, perf, perfIn, fair, lineup: xi, slotGroup, clubUid: myClubUid, date },
      { ...settings.sellKeep, poolMinutes },
    );
  }

  const rank = rankScores(records, prepared.result.rating, settings.leagueWeights);
  for (let i = 0; i < rank.length; i++) if (!pool[i]) rank[i] = NaN;
  const abilityPct = abilityPercentiles(prepared.result.ability, ranked);

  return {
    perf,
    perfUnadjusted,
    perfIn,
    myLeagueStrength,
    abilityPct,
    fair,
    moneyball,
    lineup: xi,
    fit,
    sellKeep: Object.fromEntries(verdicts),
    rank,
    valueRatio: Float64Array.from(records, (r, i) => fair[i] / marketValue(r)),
    statsVsAbility: Float32Array.from(perf, (p, i) => p - abilityPct[i]),
  };
}
