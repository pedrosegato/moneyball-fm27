import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import type { PlayerRecord } from "@/data/types";
import type { AnalysisResult } from "@/engine/index";
import type { FilterTable } from "@/store/filters";
import { useAppStore } from "@/store/index";
import type { ValueMode } from "@/store/ui";
import type { TableColumn } from "@/table/columns/types";
import type { EmptyAction } from "@/table/components/TableEmpty";
import { FilterBar } from "../components/FilterBar";
import { FilterEditorPopover } from "../components/FilterEditorPopover";
import { FiltersPanel } from "../components/FiltersPanel";
import type { FilterData } from "../lib/editor";
import { useTableFiltering } from "./useTableFiltering";

export interface FilterableTableOptions {
  table: FilterTable;
  columns: readonly TableColumn[] | null;
  players: readonly PlayerRecord[] | null | undefined;
  analysis: AnalysisResult | null | undefined;
  mode: ValueMode;
  gameDate: string | null;
  shownElsewhere?: string;
}

export function useFilterableTable({
  table,
  columns,
  players,
  analysis,
  mode,
  gameDate,
  shownElsewhere,
}: FilterableTableOptions) {
  const { t } = useTranslation();
  const { targets, applied, filtering, editor } = useTableFiltering(columns, analysis ?? null, mode, table);
  const { filtered, clearFilters } = useAppStore(
    useShallow((s) => ({ filtered: s.filters[table].length > 0, clearFilters: s.clearFilters })),
  );
  const data = useMemo<FilterData | null>(
    () => (players && analysis ? { players, analysis, gameDate } : null),
    [players, analysis, gameDate],
  );

  const clear = () => clearFilters(table);
  const clearAction: EmptyAction | null = filtered ? { label: t("clearFilters"), onClick: clear } : null;
  const filtersPanel =
    columns && data ? <FiltersPanel table={table} columns={columns} mode={mode} data={data} applied={applied} /> : null;
  const filterBar = (
    <FilterBar
      table={table}
      targets={targets}
      applied={applied}
      onEdit={(target, anchor, viaKeyboard) => editor.open(target, table, anchor, viaKeyboard)}
      shownElsewhere={shownElsewhere}
    />
  );
  const editorPopover = data ? (
    <FilterEditorPopover request={editor.request} data={data} onClose={editor.close} />
  ) : null;

  return {
    data,
    targets,
    applied,
    filtering,
    editor,
    filtered,
    clearFilters: clear,
    clearAction,
    filtersPanel,
    filterBar,
    editorPopover,
  };
}
