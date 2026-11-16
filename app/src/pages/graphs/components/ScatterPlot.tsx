import { type MouseEvent, type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";
import type { ValueMode } from "@/store/ui";
import { useDotCanvas } from "../hooks/useDotCanvas";
import { useElementSize } from "../hooks/useElementSize";
import { usePlotGeometry } from "../hooks/usePlotGeometry";
import { usePlotLabels } from "../hooks/usePlotLabels";
import { nearestPoint } from "../lib/hitTest";
import { HIT_RADIUS } from "../lib/layout";
import type { PointLevels } from "../lib/levels";
import { axisTitle, meanText, plotSummary } from "../lib/plotText";
import type { Axis, PointSet } from "../lib/scatter";
import { PointTip } from "./PointTip";
import { ScatterGrid } from "./ScatterGrid";
import { ScatterGuides } from "./ScatterGuides";
import { ScatterLabels } from "./ScatterLabels";

export interface ScatterPlotProps {
  points: PointSet;
  levels: PointLevels | null;
  x: Axis;
  y: Axis;
  mode: ValueMode;
  labeled: readonly number[];
  selected: number;
  active: number;
  uidOf(k: number): number;
  nameOf(k: number): string;
  tooltip(k: number): ReactNode;
  onHover(k: number): void;
  onOpen(k: number): void;
  stale?: boolean;
  theme?: string;
}

export function ScatterPlot({
  points,
  levels,
  x,
  y,
  mode,
  labeled,
  selected,
  active,
  uidOf,
  nameOf,
  tooltip,
  onHover,
  onOpen,
  stale,
  theme,
}: ScatterPlotProps) {
  const frame = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(frame);
  const { plotW, plotH, right, bottom, sx, sy, means, px, py, grid } = usePlotGeometry({
    points,
    x,
    y,
    mode,
    width,
    height,
  });
  const canvas = useDotCanvas({ px, py, levels, width, height, theme });
  const { captions, named, names } = usePlotLabels({
    plotW,
    plotH,
    points,
    xAbbr: x.abbr,
    yAbbr: y.abbr,
    labeled,
    selected,
    nameOf,
    px,
    py,
  });

  const xMean = meanText(means.x, x, mode);
  const yMean = meanText(means.y, y, mode);
  const n = points.rows.length;
  const summary = plotSummary({ n, x, y, xMean, yMean, leveled: levels !== null });

  const pointerAt = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return nearestPoint(grid, e.clientX - rect.left, e.clientY - rect.top, HIT_RADIUS);
  };

  return (
    <div
      className={cn(
        "relative min-h-0 min-w-0 flex-1 transition-opacity duration-(--duration-quick)",
        stale && "opacity-60",
      )}
    >
      <div ref={frame} role="img" aria-label={summary} className="absolute inset-0">
        <div
          aria-hidden
          className={cn("absolute inset-0", active >= 0 && "cursor-pointer")}
          onPointerMove={(e) => {
            const k = pointerAt(e);
            if (k !== active) onHover(k);
          }}
          onPointerLeave={() => onHover(-1)}
          onClick={(e) => {
            const k = pointerAt(e);
            if (k >= 0) onOpen(k);
          }}
        >
          <ScatterGrid sx={sx} sy={sy} x={x} y={y} mode={mode} right={right} bottom={bottom} />
          <canvas ref={canvas} className="pointer-events-none absolute inset-0 size-full" />
          {n > 0 && (
            <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
              <ScatterGuides
                xTitle={axisTitle(x, mode)}
                yTitle={axisTitle(y, mode)}
                xMean={xMean}
                yMean={yMean}
                mx={sx.at(means.x)}
                my={sy.at(means.y)}
                right={right}
                bottom={bottom}
                height={height}
              />
              <ScatterLabels
                captions={captions}
                named={named}
                names={names}
                px={px}
                py={py}
                levels={levels}
                selected={selected}
                active={active}
                uidOf={uidOf}
              />
            </svg>
          )}
        </div>
      </div>
      {active >= 0 && (
        <PointTip x={px[active]} y={py[active]} width={width} height={height}>
          {tooltip(active)}
        </PointTip>
      )}
    </div>
  );
}
