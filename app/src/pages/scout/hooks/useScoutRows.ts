import { useMemo } from "react";
import type { AnalysisResult } from "@/engine/index";
import { currentMask, indicesOf, scoutRows, useStableRows } from "@/table/lib/rows";

const NO_ROWS = new Uint32Array();

export function useScoutRows(
  analysis: AnalysisResult | null,
  count: number,
  visible: Uint8Array | null | undefined,
  undervaluedOnly: boolean,
) {
  const allRows = useMemo(() => Uint32Array.from({ length: count }, (_, i) => i), [count]);
  const moneyballFlags = analysis?.moneyball;
  const uids = analysis?.uids;
  const moneyball = useMemo(
    () => (moneyballFlags && uids ? indicesOf(moneyballFlags, uids) : NO_ROWS),
    [moneyballFlags, uids],
  );
  const candidates = undervaluedOnly ? moneyball : allRows;
  const mask = currentMask(visible, count);
  const rows = useStableRows(useMemo(() => scoutRows(candidates, mask), [candidates, mask]));
  return { rows, total: candidates.length };
}
