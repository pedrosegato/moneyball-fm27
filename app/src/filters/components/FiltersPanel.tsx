import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatCount } from "@/lib/format";
import type { FilterTable } from "@/store/filters";
import { useAppStore } from "@/store/index";
import { VALUE_MODE, type ValueMode } from "@/store/ui";
import type { TableColumn } from "@/table/columns/types";
import { columnGroups } from "@/table/lib/columnActions";
import type { FilterData } from "../lib/editor";
import { filterTarget } from "../lib/targets";
import { FilterGroup } from "./FilterGroup";

interface FiltersPanelProps {
  table: FilterTable;
  columns: readonly TableColumn[];
  mode: ValueMode;
  data: FilterData;
  applied: ReadonlySet<string>;
}

export function FiltersPanel({ table, columns, mode, data, applied }: FiltersPanelProps) {
  const { t } = useTranslation("filters");
  const { filters, clearFilters } = useAppStore(
    useShallow((s) => ({ filters: s.filters[table], clearFilters: s.clearFilters })),
  );
  const groups = useMemo(
    () =>
      columnGroups()
        .map((g) => ({
          ...g,
          targets: columns.flatMap((c) => {
            const target = c.group === g.id ? filterTarget(c, mode) : null;
            return target ? [target] : [];
          }),
        }))
        .filter((g) => g.targets.length),
    [columns, mode],
  );
  const active = useMemo(() => new Set(filters.map((f) => f.col)), [filters]);

  const [open, setOpen] = useState<string[]>([]);
  const onOpenChange = (next: boolean) => {
    if (next) setOpen(groups.filter((g) => g.targets.some((target) => active.has(target.col))).map((g) => g.id));
  };

  return (
    <Sheet onOpenChange={onOpenChange}>
      <SheetTrigger
        render={
          <Button variant="ghost">
            <SlidersHorizontal data-icon="inline-start" />
            {t("panel.title")}
            {applied.size > 0 && <span className="text-signal-text tabular-nums">{formatCount(applied.size)}</span>}
          </Button>
        }
      />
      <SheetContent side="right" className="gap-0">
        <SheetHeader className="border-b border-line-subtle pr-12">
          <SheetTitle>{t("panel.title")}</SheetTitle>
          <SheetDescription className="type-caption">
            {t("panel.description", {
              basis: mode === VALUE_MODE.percentile ? t("panel.byPercentile") : t("panel.byValue"),
            })}
          </SheetDescription>
          <Button
            variant="outline"
            size="xs"
            className="mt-2 self-start"
            disabled={filters.length === 0}
            onClick={() => clearFilters(table)}
          >
            {t("clearFilters", { ns: "common" })}
          </Button>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">
          <Accordion multiple value={open} onValueChange={(v) => setOpen(v as string[])}>
            {groups.map((g) => (
              <FilterGroup
                key={g.id}
                id={g.id}
                label={g.label}
                targets={g.targets}
                active={active}
                table={table}
                data={data}
              />
            ))}
          </Accordion>
        </div>
      </SheetContent>
    </Sheet>
  );
}
