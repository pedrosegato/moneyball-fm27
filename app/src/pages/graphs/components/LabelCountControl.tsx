import { useTranslation } from "react-i18next";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SegmentedControlItem } from "@/components/SegmentedControlItem";

const LABEL_COUNTS = [5, 10, 20] as const;

export function LabelCountControl({ count, onChange }: { count: number; onChange(count: number): void }) {
  const { t } = useTranslation("graphs");
  return (
    <SegmentedControl aria-label={t("labeled.count")} value={String(count)} onValueChange={(v) => onChange(Number(v))}>
      {LABEL_COUNTS.map((n) => (
        <SegmentedControlItem key={n} value={String(n)} className="px-2 tabular-nums">
          {n}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}
