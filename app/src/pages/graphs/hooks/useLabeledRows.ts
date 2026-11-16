import { useMemo } from "react";
import type { PlayerRecord } from "@/data/types";
import type { ValueMode } from "@/store/ui";
import { type LabeledRow, labeledRows } from "../lib/labeledRows";
import type { PointLevels } from "../lib/levels";
import type { Axis, PointSet } from "../lib/scatter";

export function useLabeledRows(
  labeled: readonly number[],
  levels: PointLevels | null,
  points: PointSet,
  players: readonly PlayerRecord[] | undefined,
  axes: { x: Axis; y: Axis } | null,
  mode: ValueMode,
) {
  return useMemo<LabeledRow[]>(
    () => (axes && players ? labeledRows({ labeled, levels, points, players, axes, mode }) : []),
    [labeled, levels, points, players, axes, mode],
  );
}
