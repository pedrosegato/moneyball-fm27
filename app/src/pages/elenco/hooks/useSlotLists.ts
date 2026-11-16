import { useMemo } from "react";
import type { PlayerRecord } from "@/data/types";
import type { AnalysisResult } from "@/engine/index";
import { FILTER_TABLE } from "@/store/filters";
import { useAppStore } from "@/store/index";
import { useData } from "@/store/useData";
import { currentMask } from "@/table/lib/rows";
import { squadOf } from "../lib/squadRows";
import { undervaluedSet } from "../lib/undervalued";

export function useSlotLists(players: readonly PlayerRecord[], analysis: AnalysisResult, club: number, slot: number) {
  const { visible } = useData();
  const undervaluedOnly = useAppStore((s) => s.ui.signingsMoneyball);
  const signingsMask = currentMask(visible[FILTER_TABLE.signings], players.length);
  const squadMask = currentMask(visible[FILTER_TABLE.squad], players.length);

  const undervalued = useMemo(() => (undervaluedOnly ? undervaluedSet(analysis) : null), [analysis, undervaluedOnly]);
  const signings = useMemo(
    () =>
      (analysis.fit[slot] ?? []).filter(
        (r) => (!signingsMask || signingsMask[r.index]) && (!undervalued || undervalued.has(r.index)),
      ),
    [analysis, slot, signingsMask, undervalued],
  );
  const squadCount = useMemo(() => {
    const squad = squadOf(players, club);
    return squadMask ? squad.filter((i) => squadMask[i]).length : squad.length;
  }, [players, club, squadMask]);
  return { signings, squadCount };
}
