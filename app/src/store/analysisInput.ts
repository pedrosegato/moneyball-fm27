import { myClubUid } from "@/data/myClub";
import type { Snapshot } from "@/data/types";
import type { AnalysisInput } from "@/engine/analysis/input";
import type { SequencedAnalysis } from "@/engine/client";
import { engineComposites } from "./composites";
import { lineupFor } from "./fit";
import type { AppState } from "./index";

export function analysisInput(state: AppState, snapshot: Snapshot): AnalysisInput {
  const club = myClubUid(snapshot);
  return {
    snapshot,
    composites: engineComposites(state.composites),
    myClubUid: club,
    settings: state.settings.engine,
    lineup: lineupFor(state.fit, club, snapshot.tactic ?? null),
    role: state.ui.role,
    period: state.ui.period,
  };
}

export const analysisInputsChanged = (s: AppState, prev: AppState): boolean =>
  s.composites !== prev.composites ||
  s.settings.engine !== prev.settings.engine ||
  s.fit !== prev.fit ||
  s.ui.role !== prev.ui.role ||
  s.ui.period !== prev.ui.period;

export function liveCompositeIds(state: AppState, analysis: SequencedAnalysis): string[] {
  const kept = new Set(engineComposites(state.composites).map((c) => c.id));
  return Object.keys(analysis.composites).filter((id) => kept.has(id));
}
