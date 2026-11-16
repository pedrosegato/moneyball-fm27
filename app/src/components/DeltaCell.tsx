import { memo } from "react";
import { i18n } from "@/i18n";
import { formatSigned } from "@/lib/format";
import { deltaTier } from "@/lib/quality";
import { readingOf } from "./statReading";
import { TierChip } from "./TierChip";

export interface DeltaCellProps {
  value: number;
  label: string;
  format(v: number): string;
  basis?: number;
  emptyReason?: string;
  className?: string;
}

export const DeltaCell = memo(function DeltaCell({
  value,
  label,
  format,
  basis,
  emptyReason,
  className,
}: DeltaCellProps) {
  const valueText = Number.isNaN(value) ? null : format(value);
  const separate = basis !== undefined && !Number.isNaN(basis);
  const why = valueText == null ? (emptyReason ?? null) : null;
  return (
    <TierChip
      shown={valueText}
      tier={valueText == null ? null : deltaTier(basis ?? value)}
      label={readingOf(label, [
        valueText,
        separate && i18n.t("stat.deltaPercentile", { delta: formatSigned(basis, 0) }),
        why,
      ])}
      tip={why}
      className={className}
    />
  );
});
