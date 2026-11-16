import { memo } from "react";
import { qualityTier } from "@/lib/quality";
import { type MissingReason, missingText } from "./missing";
import { percentileText, readingOf } from "./statReading";
import { TierChip } from "./TierChip";

export interface ScoreCellProps {
  value: number;
  label: string;
  format(v: number): string;
  pct?: number;
  missing?: MissingReason;
  emptyReason?: string;
  className?: string;
}

export const ScoreCell = memo(function ScoreCell({
  value,
  label,
  format,
  pct,
  missing,
  emptyReason,
  className,
}: ScoreCellProps) {
  const valueText = Number.isNaN(value) ? null : format(value);
  const basis = pct ?? value;
  const separate = pct !== undefined && !Number.isNaN(pct);
  const why = valueText == null ? (emptyReason ?? null) : Number.isNaN(basis) && missing ? missingText(missing) : null;
  return (
    <TierChip
      shown={valueText}
      tier={qualityTier(basis)}
      label={readingOf(label, [valueText, separate && percentileText(Math.round(pct)), why])}
      tip={why}
      className={className}
    />
  );
});
