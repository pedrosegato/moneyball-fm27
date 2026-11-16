import { useMemo, useState } from "react";
import type { AnalysisResult } from "@/engine/index";
import { type FitRow, type FitVerdict, fitVerdict } from "@/engine/tacticalFit";
import { ALL, type All } from "@/lib/constants";
import { useStableRows } from "@/table/lib/rows";
import { countVerdicts } from "../lib/fitRows";

export type VerdictFilter = FitVerdict | All;

export function useSigningsVerdicts(analysis: AnalysisResult, slot: number, signings: readonly FitRow[], lvl: number) {
  const [picked, setPicked] = useState<{ slot: number; verdict: VerdictFilter }>({ slot, verdict: ALL });
  const mine = analysis.lineup.xi[slot];
  const counts = useMemo(() => (mine === null ? null : countVerdicts(signings, lvl)), [mine, signings, lvl]);
  const verdict: VerdictFilter = counts && picked.slot === slot ? picked.verdict : ALL;
  const rows = useStableRows(
    useMemo(
      () =>
        Uint32Array.from(
          signings.filter((r) => verdict === ALL || fitVerdict(r.diff, lvl) === verdict),
          (r) => r.index,
        ),
      [signings, verdict, lvl],
    ),
  );
  return { counts, verdict, pickVerdict: (next: VerdictFilter) => setPicked({ slot, verdict: next }), rows };
}
