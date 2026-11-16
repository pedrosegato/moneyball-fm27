import { useMemo } from "react";
import type { PlayerRecord } from "@/data/types";
import type { AnalysisResult } from "@/engine/index";
import { engineComposites } from "@/store/composites";
import { useAppStore, useMoney } from "@/store/index";
import { buildColumns } from "../columns/build";

export function usePlayerColumns(
  players: readonly PlayerRecord[] | null | undefined,
  analysis: AnalysisResult | null | undefined,
) {
  const compositesState = useAppStore((s) => s.composites);
  const composites = useMemo(() => engineComposites(compositesState), [compositesState]);
  const money = useMoney();
  const columns = useMemo(
    () => (players && analysis ? buildColumns({ players, analysis, composites, money }) : null),
    [players, analysis, composites, money],
  );
  return { composites, columns };
}
