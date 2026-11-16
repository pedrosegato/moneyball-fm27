import { useTranslation } from "react-i18next";
import type { StatUnit } from "@/engine/stats/catalog";

interface StatTipProps {
  label: string;
  description: string;
  unit?: StatUnit;
}

export function StatTip({ label, description, unit }: StatTipProps) {
  const { t } = useTranslation();
  return (
    <span className="flex flex-col gap-0.5 text-left">
      <span>
        <span className="font-semibold text-fg">{label}</span> — {description}
      </span>
      {unit && <span className="type-caption text-fg-muted">{t("stat.unit", { unit: t(`unit.${unit}`) })}</span>}
    </span>
  );
}
