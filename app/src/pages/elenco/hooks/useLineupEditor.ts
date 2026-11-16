import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { PlayerRecord, Tactic } from "@/data/types";
import type { AnalysisResult } from "@/engine/index";
import { engineSlots } from "@/engine/tacticShape";
import { effectiveLineup, lineupOf } from "@/store/fit";
import { appStore, useAppStore } from "@/store/index";
import { elencoT } from "../lib/elencoT";
import { type EditableLineup, frozenPicks, sameSlots } from "../lib/lineupEdits";
import { useEffectiveLineup } from "./useEffectiveLineup";

export interface LineupEditorSource {
  players: readonly PlayerRecord[];
  analysis: AnalysisResult;
  club: number;
  tactic: Tactic | null;
}

export function useLineupEditor({ players, analysis, club, tactic }: LineupEditorSource) {
  const store = useAppStore(
    useShallow((s) => ({ setFormation: s.setFormation, editLineup: s.editLineup, resetLineup: s.resetLineup })),
  );
  const effective = useEffectiveLineup(
    useAppStore((s) => lineupOf(s.fit, club)),
    tactic,
  );
  const [outdated, setOutdated] = useState<AnalysisResult | null>(null);

  const editBlocked =
    !sameSlots(analysis.lineup.slots, engineSlots(effective.slots)) || analysis === outdated
      ? elencoT("building")
      : null;
  const resetting = (reset: () => void) => {
    setOutdated(analysis);
    reset();
  };

  const edit = (change: (lineup: EditableLineup) => EditableLineup | null): boolean => {
    if (editBlocked) return false;
    const current = effectiveLineup(lineupOf(appStore.getState().fit, club), tactic);
    const shown = frozenPicks(analysis.lineup.xi.map((i) => (i === null ? null : players[i].uid)));
    const next = change({ slots: current.slots, picks: { ...shown, ...current.picks } });
    if (next) store.editLineup(club, { base: current.base, name: current.name, slots: [...next.slots] }, next.picks);
    return next !== null;
  };

  return {
    editBlocked,
    edit,
    setFormation: (formation: string) => resetting(() => store.setFormation(club, formation)),
    reset: () => resetting(() => store.resetLineup(club)),
  };
}
