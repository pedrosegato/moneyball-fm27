import { TriangleAlert } from "lucide-react";
import { type ReactNode, useId } from "react";
import type { MeterReading } from "../lib/meterReading";
import { BudgetHeadline } from "./BudgetHeadline";
import { BudgetMeterBar, type MeterSegment } from "./BudgetMeterBar";

interface BudgetMeterProps {
  title: string;
  budget: number | null;
  reading: MeterReading;
  over: boolean;
  segments: readonly MeterSegment[];
  overText: string;
  children: ReactNode;
}

export function BudgetMeter({ title, budget, reading, over, segments, overText, children }: BudgetMeterProps) {
  const id = useId();
  const used = Math.max(
    0,
    segments.reduce((t, s) => t + s.value, 0),
  );
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="type-label text-fg-secondary">
          {title}
        </h2>{" "}
        <span className="type-label tabular-nums">
          <BudgetHeadline reading={reading} />
        </span>
      </div>
      <meter
        aria-labelledby={id}
        min={0}
        max={budget ?? 0}
        value={budget === null ? 0 : Math.min(used, Math.max(0, budget))}
        aria-valuetext={reading.spoken}
        className="sr-only"
      />
      <BudgetMeterBar budget={budget} over={over} segments={segments} />
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 type-label">{children}</dl>
      <div aria-live="polite">
        {over && (
          <p className="flex gap-1.5 rounded-lg bg-danger-wash px-2 py-1.5 type-caption text-fg">
            <TriangleAlert className="mt-px size-3.5 shrink-0 text-destructive" aria-hidden />
            {overText}
          </p>
        )}
      </div>
    </section>
  );
}
