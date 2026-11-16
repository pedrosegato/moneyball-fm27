import type { ValueMode } from "@/store/ui";
import { MARGIN } from "../lib/layout";
import { tickText } from "../lib/plotText";
import type { Scale } from "../lib/scale";
import type { Axis } from "../lib/scatter";

const TICK_GAP = 8;
const X_TICK_DROP = 16;
const Y_TICK_BASELINE = 4;

interface ScatterGridProps {
  sx: Scale;
  sy: Scale;
  x: Axis;
  y: Axis;
  mode: ValueMode;
  right: number;
  bottom: number;
}

export function ScatterGrid({ sx, sy, x, y, mode, right, bottom }: ScatterGridProps) {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
      {sx.ticks.map((t) => (
        <g key={`x${t}`}>
          <line
            x1={sx.at(t)}
            x2={sx.at(t)}
            y1={MARGIN.top}
            y2={bottom}
            className="stroke-line-subtle"
            shapeRendering="crispEdges"
          />
          <text
            x={sx.at(t)}
            y={bottom + X_TICK_DROP}
            textAnchor="middle"
            className="fill-fg-muted type-caption tabular-nums"
          >
            {tickText(t, sx.step, x, mode)}
          </text>
        </g>
      ))}
      {sy.ticks.map((t) => (
        <g key={`y${t}`}>
          <line
            x1={MARGIN.left}
            x2={right}
            y1={sy.at(t)}
            y2={sy.at(t)}
            className="stroke-line-subtle"
            shapeRendering="crispEdges"
          />
          <text
            x={MARGIN.left - TICK_GAP}
            y={sy.at(t) + Y_TICK_BASELINE}
            textAnchor="end"
            className="fill-fg-muted type-caption tabular-nums"
          >
            {tickText(t, sy.step, y, mode)}
          </text>
        </g>
      ))}
    </svg>
  );
}
