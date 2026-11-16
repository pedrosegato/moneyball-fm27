import type { SortingState } from "@tanstack/react-table";
import { type RefObject, useMemo } from "react";
import { STAT_GROUPS } from "@/engine/stats/groups";
import type { ColumnFiltering, HeaderMenuActions } from "@/filters/lib/headerMenu";
import { NAME_COLUMN } from "../columns/ids";
import type { TableColumn, TableColumnState } from "../columns/types";
import { viewColumns } from "../columns/visibility";
import { type ColumnActions, setColumnShown } from "../lib/columnActions";
import { headerOf } from "../lib/domSelectors";
import { sortedAs } from "../lib/header";
import { tableText } from "../lib/tableText";
import { NO_SORT } from "./useTableSorting";

interface HeaderMenuOptions {
  byId: ReadonlyMap<string, TableColumn>;
  tableRef: RefObject<HTMLTableElement | null>;
  sorting: SortingState;
  chosenSort: SortingState;
  setChosenSort(sorting: SortingState): void;
  columnState: TableColumnState;
  columnActions: ColumnActions;
  filtering: ColumnFiltering | undefined;
}

export function useHeaderMenuActions({
  byId,
  tableRef,
  sorting,
  chosenSort,
  setChosenSort,
  columnState,
  columnActions,
  filtering,
}: HeaderMenuOptions) {
  return useMemo<HeaderMenuActions>(
    () => ({
      column: (id) => byId.get(id),
      header: (id) => tableRef.current?.querySelector<HTMLElement>(headerOf(id)) ?? null,
      sortedAs: (id) => sortedAs(sorting[0], id) || null,
      sortBy: (id, desc) => setChosenSort([{ id, desc }]),
      sortedByUser: (id) => chosenSort[0]?.id === id,
      unsort: () => setChosenSort(NO_SORT),
      hideBlock: (id) => {
        const column = byId.get(id);
        if (!column || id === NAME_COLUMN) return null;
        const shownBy = STAT_GROUPS.find((g) => g.id === column.group && columnState.groups.includes(g.id));
        if (shownBy) return tableText("hide.byGroup", { group: shownBy.label });
        return viewColumns(columnState).has(id) || columnState.groups.length ? tableText("hide.fixed") : undefined;
      },
      hide: (id) => setColumnShown(columnState, columnActions, id, false),
      filtering,
    }),
    [byId, tableRef, sorting, chosenSort, setChosenSort, columnState, columnActions, filtering],
  );
}
