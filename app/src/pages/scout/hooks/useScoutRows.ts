import { useMemo } from "react";
import type { AnalysisResult } from "@/engine/index";
import { indicesOf } from "@/table/lib/rows";

const NO_ROWS = new Uint32Array();

export function useScoutRows(analysis: AnalysisResult | null, count: number, undervaluedOnly: boolean) {
  const allRows = useMemo(() => Uint32Array.from({ length: count }, (_, i) => i), [count]);
  const moneyballFlags = analysis?.moneyball;
  const uids = analysis?.uids;
  const moneyball = useMemo(
    () => (moneyballFlags && uids ? indicesOf(moneyballFlags, uids) : NO_ROWS),
    [moneyballFlags, uids],
  );
  return undervaluedOnly ? moneyball : allRows;
}
