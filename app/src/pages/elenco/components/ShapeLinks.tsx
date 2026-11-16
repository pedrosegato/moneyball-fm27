import { type ShapeSlot, sameSpot, spotOf } from "@/engine/tacticShape";
import { PITCH_COLUMNS, PITCH_ROWS } from "../lib/slots";

const CELL_CENTRES = {
  inset: "calc(var(--pitch-py) - var(--pitch-gy) / 2) calc(var(--pitch-px) - var(--pitch-gx) / 2)",
};

const percent = (cell: number, cells: number) => `${((cell - 0.5) / cells) * 100}%`;

export function ShapeLinks({ slots }: { slots: readonly ShapeSlot[] }) {
  const links = slots.flatMap((slot, k) => {
    const from = spotOf(slot.ip);
    const to = spotOf(slot.oop);
    return sameSpot(from, to) ? [] : [{ k, from, to }];
  });
  return (
    <div aria-hidden className="pointer-events-none absolute text-line-strong/60" style={CELL_CENTRES}>
      <svg
        aria-hidden
        viewBox={`0 0 ${PITCH_COLUMNS} ${PITCH_ROWS}`}
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
      >
        {links.map(({ k, from, to }) => (
          <line
            key={k}
            data-shape-link=""
            x1={from.col - 0.5}
            y1={from.row - 0.5}
            x2={to.col - 0.5}
            y2={to.row - 0.5}
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {links.map(({ k, to }) => (
        <span
          key={k}
          className="absolute size-2 -translate-1/2 rounded-full border border-current"
          style={{ left: percent(to.col, PITCH_COLUMNS), top: percent(to.row, PITCH_ROWS) }}
        />
      ))}
    </div>
  );
}
