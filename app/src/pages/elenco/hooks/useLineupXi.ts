import { useMemo } from "react";
import type { PlayerRecord } from "@/data/types";
import type { AnalysisResult } from "@/engine/index";
import { placePicks } from "@/engine/tacticalFit";
import { engineSlots } from "@/engine/tacticShape";
import type { EffectiveLineup } from "@/store/fit";
import { carriedOver, namesEverySlot, sameSlots } from "../lib/lineupEdits";

export function useLineupXi(
  players: readonly PlayerRecord[],
  analysis: AnalysisResult,
  club: number,
  lineup: EffectiveLineup,
): readonly (number | null)[] {
  return useMemo(() => {
    const count = lineup.slots.length;
    if (namesEverySlot(lineup.picks, count)) return placePicks(players, club, count, lineup.picks);
    const slots = engineSlots(lineup.slots);
    return sameSlots(slots, analysis.lineup.slots) ? analysis.lineup.xi : carriedOver(analysis.lineup, slots);
  }, [lineup, analysis, players, club]);
}
