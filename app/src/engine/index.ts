import { analyzeDisplay, type DisplayAnalysis } from "./analysis/display";
import type { AnalysisInput } from "./analysis/input";
import { analyzeModel } from "./analysis/model";
import { prepareSnapshot, type SnapshotAnalysis } from "./analysis/prepare";
import { type RoleAnalysis, viewRoles } from "./analysis/roles";
import { type ScoreAnalysis, scorePlayers } from "./analysis/score";
import { type SquadRoleAnalysis, squadRoles } from "./analysis/squadRoles";
import { poolFlags } from "./club";
import { applyPeriod, CURRENT_SEASON, type Period } from "./period";

export type AnalysisResult = SnapshotAnalysis &
  DisplayAnalysis &
  ScoreAnalysis &
  RoleAnalysis &
  SquadRoleAnalysis & { period: Period };

export function runAnalysis({
  snapshot,
  composites,
  role = null,
  period = CURRENT_SEASON,
  ...scoring
}: AnalysisInput): AnalysisResult {
  const prepared = prepareSnapshot(applyPeriod(snapshot, period));
  const { poolMinutes, leagueAdjustment } = scoring.settings;
  const display = analyzeDisplay(prepared, { poolMinutes, composites });
  const model = analyzeModel(prepared, { ...scoring, poolMinutes, leagueAdjustment });
  return {
    ...prepared.result,
    ...display,
    ...scorePlayers(prepared, model, scoring),
    ...viewRoles(prepared.records, prepared.groups, model.roles, role),
    squadRoles: squadRoles(prepared.records, model.roles, scoring.myClubUid, poolFlags(prepared.records, poolMinutes)),
    period,
  };
}
