import { useTranslation } from "react-i18next";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SegmentedControlItem } from "@/components/SegmentedControlItem";

const WEIGHT = { off: "off", on: "on" } as const;

export function WeightToggle({ weighted, onChange }: { weighted: boolean; onChange(weighted: boolean): void }) {
  const { t } = useTranslation("rank");
  return (
    <SegmentedControl
      aria-label={t("toolbar.weight")}
      value={weighted ? WEIGHT.on : WEIGHT.off}
      onValueChange={(v) => onChange(v === WEIGHT.on)}
    >
      <SegmentedControlItem value={WEIGHT.off}>{t("toolbar.off")}</SegmentedControlItem>
      <SegmentedControlItem value={WEIGHT.on}>{t("toolbar.on")}</SegmentedControlItem>
    </SegmentedControl>
  );
}
