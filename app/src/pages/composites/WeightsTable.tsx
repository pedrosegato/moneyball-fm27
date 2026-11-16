import { useTranslation } from "react-i18next";
import type { Composite } from "@/engine/composites";
import type { StatKey } from "@/engine/stats/catalog";
import { cn } from "@/lib/utils";
import type { CompositeRules } from "@/store/compositeRules";
import { WeightRow } from "./WeightRow";
import { WEIGHTS_HEAD } from "./weightsTableStyles";

interface WeightsTableProps {
  composite: Composite;
  rules: CompositeRules;
  onChange(weights: Record<StatKey, number>): void;
}

export function WeightsTable({ composite, rules, onChange }: WeightsTableProps) {
  const { t } = useTranslation("settings");
  const entries = Object.entries(composite.weights);
  const total = entries.reduce((sum, [, w]) => (w > 0 ? sum + w : sum), 0);
  const shares = composite.kind === "percentileMean";
  const removable = entries.length > rules.minStats;
  const without = (key: StatKey) => Object.fromEntries(entries.filter(([k]) => k !== key));

  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line px-3 py-4 type-label text-fg-muted">
        {t("composites.weights.empty")}
      </p>
    );
  }
  return (
    <table aria-label={t("composites.weights.aria")} className="w-full table-fixed border-collapse">
      <thead>
        <tr className="border-b border-line-subtle">
          <th scope="col" className={WEIGHTS_HEAD}>
            {t("statTable.stat", { ns: "common" })}
          </th>
          <th scope="col" className={cn(WEIGHTS_HEAD, "w-28")}>
            {t("composites.weights.weight")}
          </th>
          {shares && (
            <th scope="col" className={cn(WEIGHTS_HEAD, "w-24")}>
              {t("composites.weights.share")}
            </th>
          )}
          <th scope="col" className={cn(WEIGHTS_HEAD, "w-10")}>
            <span className="sr-only">{t("composites.weights.remove")}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([key, weight]) => (
          <WeightRow
            key={key}
            statKey={key}
            weight={weight}
            share={total > 0 && weight > 0 ? weight / total : 0}
            showShare={shares}
            removable={removable}
            minStats={rules.minStats}
            onWeight={(w) => onChange({ ...composite.weights, [key]: w })}
            onRemove={() => onChange(without(key))}
          />
        ))}
      </tbody>
    </table>
  );
}
