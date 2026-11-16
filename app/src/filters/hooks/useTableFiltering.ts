import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { AnalysisResult } from "@/engine/index";
import { type FilterTable, usableFilters } from "@/store/filters";
import { useAppStore } from "@/store/index";
import type { ValueMode } from "@/store/ui";
import type { TableColumn } from "@/table/columns/types";
import { type ColumnFiltering, MENU_TRIGGER } from "../lib/headerMenu";
import { type FilterTarget, filterCols, filterTarget, filterTargets } from "../lib/targets";
import { useFilterEditor } from "./useFilterEditor";

const menuButtonOf = (header: HTMLElement) => header.querySelector<HTMLElement>(MENU_TRIGGER);

const NO_TARGETS = new Map<string, FilterTarget>();

export function useTableFiltering(
  columns: readonly TableColumn[] | null,
  analysis: AnalysisResult | null,
  mode: ValueMode,
  table: FilterTable,
) {
  const { filters, removeFilter } = useAppStore(
    useShallow((s) => ({ filters: s.filters[table], removeFilter: s.removeFilter })),
  );
  const editor = useFilterEditor();
  const openEditor = editor.open;

  const targets = useMemo(() => (columns ? filterTargets(columns) : NO_TARGETS), [columns]);
  const applied = useMemo(
    () => new Set(analysis ? usableFilters(filters, Object.keys(analysis.composites)).map((f) => f.col) : []),
    [filters, analysis],
  );

  const filtering = useMemo<ColumnFiltering>(() => {
    const active = new Set(filters.map((f) => f.col));
    return {
      stateOf(column) {
        const filtered = filterCols(column).some((col) => active.has(col));
        return { filterable: !!filterTarget(column, mode), active: filtered };
      },
      edit(column, anchor, viaKeyboard) {
        const target = filterTarget(column, mode);
        if (target) openEditor(target, table, anchor, viaKeyboard, menuButtonOf(anchor) ?? anchor);
      },
      clear(column) {
        for (const col of filterCols(column)) removeFilter(table, col);
      },
    };
  }, [table, filters, mode, openEditor, removeFilter]);

  return { targets, applied, filtering, editor };
}
