import { useMemo } from "react";
import type { ReconciledItem } from "@/cart/lib/reconcile";
import type { PlayerRecord } from "@/data/types";
import type { AnalysisResult } from "@/engine/index";
import { useMoney } from "@/store/index";
import { usePlayerColumns } from "@/table/hooks/usePlayerColumns";
import { cartColumns } from "../lib/cartColumns";

export function useCartColumns(
  players: readonly PlayerRecord[] | undefined,
  analysis: AnalysisResult | null,
  lineAt: ReadonlyMap<number, ReconciledItem>,
) {
  const { composites, columns: base } = usePlayerColumns(players, analysis);
  const money = useMoney();
  const columns = useMemo(
    () => (base && players ? cartColumns(base, { players, lineAt, money }) : null),
    [base, players, lineAt, money],
  );
  return { composites, columns };
}
