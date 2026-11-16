import { useTranslation } from "react-i18next";
import { TierLegend } from "@/components/TierLegend";
import { REFMIN } from "@/engine/percentiles";
import type { PointLevels } from "../lib/levels";

export function LevelsNote({ n, levels }: { n: number; levels: PointLevels | null }) {
  const { t } = useTranslation("graphs");
  if (n === 0) return null;
  if (levels) {
    return (
      <div className="ml-auto flex items-center gap-2.5">
        <span className="type-caption text-fg-muted">{t("levels.label")}</span>
        <TierLegend label={t("levels.legend")} counts={levels.counts} />
      </div>
    );
  }
  return (
    <p className="ml-auto type-caption text-fg-muted">
      {n < REFMIN ? t("levels.tooFew", { min: REFMIN }) : t("levels.samePoint")}
    </p>
  );
}
