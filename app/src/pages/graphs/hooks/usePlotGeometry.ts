import { useMemo } from "react";
import type { ValueMode } from "@/store/ui";
import { hitGrid } from "../lib/hitTest";
import { HIT_RADIUS, MARGIN } from "../lib/layout";
import { scaleOf } from "../lib/scale";
import { type Axis, betterHigh, mean, type PointSet } from "../lib/scatter";

interface GeometryInput {
  points: PointSet;
  x: Axis;
  y: Axis;
  mode: ValueMode;
  width: number;
  height: number;
}

export function usePlotGeometry({ points, x, y, mode, width, height }: GeometryInput) {
  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotH = Math.max(0, height - MARGIN.top - MARGIN.bottom);
  const xHigh = betterHigh(x, mode);
  const yHigh = betterHigh(y, mode);

  const sx = useMemo(() => scaleOf(points.x, xHigh, mode, MARGIN.left, plotW, false), [points.x, xHigh, mode, plotW]);
  const sy = useMemo(() => scaleOf(points.y, yHigh, mode, MARGIN.top, plotH, true), [points.y, yHigh, mode, plotH]);
  const means = useMemo(() => ({ x: mean(points.x), y: mean(points.y) }), [points]);

  const { px, py } = useMemo(() => {
    const n = points.rows.length;
    const px = new Float32Array(n);
    const py = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      px[k] = sx.at(points.x[k]);
      py[k] = sy.at(points.y[k]);
    }
    return { px, py };
  }, [points, sx, sy]);
  const grid = useMemo(() => hitGrid(px, py, HIT_RADIUS), [px, py]);

  return {
    plotW,
    plotH,
    right: MARGIN.left + plotW,
    bottom: MARGIN.top + plotH,
    sx,
    sy,
    means,
    px,
    py,
    grid,
  };
}
