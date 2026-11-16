import { cn } from "@/lib/utils";

const METER_FILL_MOTION = "transition-[width] duration-(--duration-panel) ease-out motion-reduce:transition-none";

export interface MeterSegment {
  id: string;
  value: number;
  className: string;
}

interface BudgetMeterBarProps {
  budget: number | null;
  over: boolean;
  segments: readonly MeterSegment[];
}

export function BudgetMeterBar({ budget, over, segments }: BudgetMeterBarProps) {
  const width = (v: number) => (budget && budget > 0 ? `${Math.min(100, Math.max(0, (v / budget) * 100))}%` : "0%");
  return (
    <div aria-hidden className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-surface-control">
      {over ? (
        <i aria-hidden className="w-full rounded-full bg-destructive" />
      ) : (
        segments.map(
          (s) =>
            s.value > 0 && (
              <i
                key={s.id}
                aria-hidden
                className={cn("rounded-full", METER_FILL_MOTION, s.className)}
                style={{ width: width(s.value) }}
              />
            ),
        )
      )}
    </div>
  );
}
