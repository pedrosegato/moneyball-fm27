import { cn } from "@/lib/utils";
import type { Compared } from "../lib/compared";
import { SLOT_BAR } from "../lib/slotStyles";

const BAR_PITCH = 8;

const filled = (pct: number) => `${Math.min(100, Math.max(0, Math.round(pct)))}%`;

export function CompareBars({ entries, at }: { entries: readonly Compared[]; at: number }) {
  return (
    <div
      className="relative my-1.5 before:absolute before:inset-y-[-0.375rem] before:left-1/2 before:z-10 before:w-px before:bg-line-strong after:absolute after:inset-y-[-0.375rem] after:left-[95%] after:z-10 after:w-px after:bg-line"
      style={{ height: entries.length * BAR_PITCH - 2 }}
    >
      {entries.map(({ uid, slot, lines }, j) => {
        const { pct } = lines[at];
        return (
          <span
            key={uid}
            className="absolute inset-x-0 h-1.5 rounded-full bg-surface-active"
            style={{ top: j * BAR_PITCH }}
          >
            {!Number.isNaN(pct) && (
              <i
                className={cn("absolute inset-y-0 left-0 rounded-full", SLOT_BAR[slot])}
                style={{ width: filled(pct) }}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}
