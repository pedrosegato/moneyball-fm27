import { useMemo } from "react";
import { COLUMN } from "@/engine/columnIds";
import type { ChipColumn } from "@/table/columns/types";
import { rankScoreOf } from "../lib/rankScore";

export function useRankScore(
  stats: readonly ChipColumn[],
  scoreId: string,
  poolMinutes: number,
  rating: Float64Array | undefined,
) {
  const stat = scoreId === COLUMN.rating ? null : (stats.find((c) => c.id === scoreId) ?? null);
  const score = useMemo(() => rankScoreOf(stat, poolMinutes), [stat, poolMinutes]);
  return { stat, score, scoreValues: stat ? stat.pct : rating };
}
