import { useTranslation } from "react-i18next";
import { VALUE_MODE, type ValueMode } from "@/store/ui";
import { SegmentedControl } from "./SegmentedControl";
import { SegmentedControlItem } from "./SegmentedControlItem";

export function ValueModeControl({ mode, onChange }: { mode: ValueMode; onChange(mode: ValueMode): void }) {
  const { t } = useTranslation();
  return (
    <SegmentedControl aria-label={t("valueMode.label")} value={mode} onValueChange={(m) => onChange(m as ValueMode)}>
      <SegmentedControlItem value={VALUE_MODE.value}>{t("valueMode.value")}</SegmentedControlItem>
      <SegmentedControlItem value={VALUE_MODE.percentile}>{t("valueMode.percentile")}</SegmentedControlItem>
    </SegmentedControl>
  );
}
