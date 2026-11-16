import { useMemo } from "react";
import type { AnalysisResult } from "@/engine/index";
import type { ValueMode } from "@/store/ui";
import { currentMask } from "@/table/lib/rows";
import { type Axis, NO_POINTS, plottedValues, pointSet } from "../lib/scatter";

export function useGraphPoints(
  analysis: AnalysisResult | null,
  visible: Uint8Array | null | undefined,
  count: number,
  axes: { x: Axis; y: Axis } | null,
  mode: ValueMode,
) {
  const mask = currentMask(visible, count);
  return useMemo(
    () =>
      analysis && axes
        ? pointSet(
            count,
            { visible: mask, pool: analysis.pool },
            plottedValues(axes.x, mode),
            plottedValues(axes.y, mode),
          )
        : NO_POINTS,
    [analysis, axes, count, mask, mode],
  );
}
