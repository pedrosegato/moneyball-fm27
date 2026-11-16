import { TIER_MARK_CLASS, TIERS } from "@/lib/quality";
import { cn } from "@/lib/utils";
import { LABEL_BASELINE, MARGIN } from "../lib/layout";
import type { PointLevels } from "../lib/levels";
import type { NamedPoint, PlacedText } from "../lib/plotLabels";

const HALO = "stroke-surface-canvas type-caption [paint-order:stroke] [stroke-linejoin:round] [stroke-width:3px]";

interface ScatterLabelsProps {
  captions: readonly PlacedText[];
  named: readonly number[];
  names: readonly NamedPoint[];
  px: Float32Array;
  py: Float32Array;
  levels: PointLevels | null;
  selected: number;
  active: number;
  uidOf(k: number): number;
}

export function ScatterLabels({ captions, named, names, px, py, levels, selected, active, uidOf }: ScatterLabelsProps) {
  return (
    <>
      <g className={`fill-fg-muted ${HALO}`}>
        {captions.map(({ text, box }) => (
          <text key={text} x={MARGIN.left + box.x} y={MARGIN.top + box.y + LABEL_BASELINE}>
            {text}
          </text>
        ))}
      </g>
      {named.map((k) => (
        <circle
          key={`dot${k}`}
          data-player={uidOf(k)}
          cx={px[k]}
          cy={py[k]}
          r={4}
          className={cn(
            levels ? TIER_MARK_CLASS[TIERS[levels.tier[k]]] : "fill-fg-muted",
            "stroke-surface-canvas [stroke-width:2px]",
          )}
        />
      ))}
      {selected >= 0 && (
        <circle cx={px[selected]} cy={py[selected]} r={7} className="fill-none stroke-signal [stroke-width:2px]" />
      )}
      <g className={`fill-fg ${HALO}`}>
        {names.map(({ k, text, box }) => (
          <text key={`name${k}`} x={MARGIN.left + box.x} y={MARGIN.top + box.y + LABEL_BASELINE}>
            {text}
          </text>
        ))}
      </g>
      {active >= 0 && (
        <circle cx={px[active]} cy={py[active]} r={8} className="fill-none stroke-fg [stroke-width:1.5px]" />
      )}
    </>
  );
}
