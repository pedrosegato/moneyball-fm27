import { useMemo } from "react";
import type { Tactic } from "@/data/types";
import { type EffectiveLineup, effectiveLineup, type LineupState } from "@/store/fit";

export function useEffectiveLineup(lineup: LineupState, tactic: Tactic | null): EffectiveLineup {
  return useMemo(() => effectiveLineup(lineup, tactic), [lineup, tactic]);
}
