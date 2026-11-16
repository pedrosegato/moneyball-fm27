import { useMemo } from "react";
import type { PlayerRecord } from "@/data/types";
import type { PosGroup } from "@/engine/positions";
import type { TableColumn } from "@/table/columns/types";
import { currentMask, useStableRows } from "@/table/lib/rows";
import { rankColumns, rankEligible } from "../lib/rankRows";
import type { RankScore } from "../lib/rankScore";
import { rankTableColumns } from "../lib/rankTableColumns";

const NO_ROWS = new Uint32Array();

interface RankTableInput {
  players: readonly PlayerRecord[] | undefined;
  base: readonly TableColumn[] | null;
  visible: Uint8Array | null | undefined;
  poolMinutes: number;
  group: PosGroup | null;
  scoreValues: ArrayLike<number> | undefined;
  score: RankScore;
  weights: Readonly<Record<string, number>>;
  weighted: boolean;
}

export function useRankTable({
  players,
  base,
  visible,
  poolMinutes,
  group,
  scoreValues,
  score,
  weights,
  weighted,
}: RankTableInput) {
  const mask = currentMask(visible, players?.length ?? 0);
  const eligible = useMemo(
    () => (players ? rankEligible(players, poolMinutes, mask, group) : null),
    [players, poolMinutes, mask, group],
  );
  const rank = useMemo(
    () => (players && scoreValues && eligible ? rankColumns(players, scoreValues, eligible, weights, weighted) : null),
    [players, scoreValues, eligible, weights, weighted],
  );
  const rows = useStableRows(rank?.rows ?? NO_ROWS);
  const columns = useMemo(() => (base && rank ? rankTableColumns(base, rank, score) : null), [base, rank, score]);
  return { rows, columns };
}
