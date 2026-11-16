import { useMemo } from "react";
import type { ValueMode } from "@/store/ui";
import { labeledPoints } from "../lib/labels";
import { noLevelsReason, pointLevels } from "../lib/levels";
import { type Axis, betterHigh, type PointSet } from "../lib/scatter";

export function usePlotLevels(points: PointSet, axes: { x: Axis; y: Axis } | null, mode: ValueMode, labels: number) {
  const xHigh = axes ? betterHigh(axes.x, mode) : true;
  const yHigh = axes ? betterHigh(axes.y, mode) : true;
  const labeled = useMemo(() => labeledPoints(points, labels, xHigh, yHigh), [points, xHigh, yHigh, labels]);
  const levels = useMemo(() => pointLevels(points, xHigh, yHigh), [points, xHigh, yHigh]);
  const noLevels = levels ? undefined : noLevelsReason(points.rows.length);
  return { labeled, levels, noLevels };
}
