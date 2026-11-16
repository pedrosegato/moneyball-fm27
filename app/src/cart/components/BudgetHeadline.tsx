import { TriangleAlert } from "lucide-react";
import type { MeterReading } from "../lib/meterReading";

export function BudgetHeadline({ reading }: { reading: MeterReading }) {
  switch (reading.tone) {
    case "unknown":
      return (
        <span className="font-semibold text-fg-muted" title={reading.spoken}>
          {reading.text}
        </span>
      );
    case "over":
      return (
        <span className="inline-flex items-center gap-1 font-semibold text-destructive">
          <TriangleAlert className="size-3.5" aria-hidden />
          {reading.text}
        </span>
      );
    case "left":
      return <span className="font-semibold text-fg">{reading.text}</span>;
    case "none":
      return <span className="text-fg-muted">{reading.text}</span>;
  }
}
