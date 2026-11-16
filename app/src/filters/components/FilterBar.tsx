import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { FilterChip } from "@/components/FilterChip";
import { Button } from "@/components/ui/button";
import type { FilterTable } from "@/store/filters";
import { useAppStore } from "@/store/index";
import { filterLabel } from "../lib/filterLabels";
import type { FilterTarget } from "../lib/targets";

interface FilterBarProps {
  table: FilterTable;
  targets: ReadonlyMap<string, FilterTarget>;
  applied: ReadonlySet<string>;
  onEdit(target: FilterTarget, anchor: HTMLButtonElement, viaKeyboard: boolean): void;
  shownElsewhere?: string;
}

export function FilterBar({ table, targets, applied, onEdit, shownElsewhere }: FilterBarProps) {
  const { t } = useTranslation("filters");
  const { filters, removeFilter, clearFilters } = useAppStore(
    useShallow((s) => ({ filters: s.filters[table], removeFilter: s.removeFilter, clearFilters: s.clearFilters })),
  );
  const listed = filters.filter((f) => f.col !== shownElsewhere);
  if (!listed.length) return null;
  return (
    <fieldset
      aria-label={t("bar.label")}
      className="flex min-w-[min(24rem,100%)] flex-1 flex-wrap items-center gap-1.5 py-1"
    >
      {listed.map((filter) => {
        const target = targets.get(filter.col);
        const label = filterLabel(filter, target);
        if (!applied.has(filter.col)) {
          return (
            <FilterChip
              key={filter.col}
              label={t("bar.invalid", { label })}
              className="bg-surface-control text-fg-muted line-through decoration-fg-faint"
              onRemove={() => removeFilter(table, filter.col)}
            />
          );
        }
        return (
          <FilterChip
            key={filter.col}
            label={label}
            onEdit={target && ((anchor, viaKeyboard) => onEdit(target, anchor, viaKeyboard))}
            onRemove={() => removeFilter(table, filter.col)}
          />
        );
      })}
      <Button variant="ghost" size="xs" className="text-fg-muted" onClick={() => clearFilters(table)}>
        {t("clearFilters", { ns: "common" })}
      </Button>
    </fieldset>
  );
}
