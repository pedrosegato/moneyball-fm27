import { functionalUpdate, type SortingState, type Updater, useTable } from "@tanstack/react-table";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PlayerRecord } from "@/data/types";
import type { Composite } from "@/engine/composites";
import type { AnalysisResult } from "@/engine/index";
import type { ColumnFiltering } from "@/filters/lib/headerMenu";
import { createHeaderMenuHandle } from "@/filters/lib/headerMenuHandle";
import { playersCsvName } from "@/lib/storageKeys";
import { appStore } from "@/store/index";
import { type SearchKey, VALUE_MODE, type ValueMode } from "@/store/ui";
import { buildColumns } from "./columns/build";
import { sortRows } from "./columns/sort";
import type { TableColumn, TableColumnState } from "./columns/types";
import { visibleColumnIds } from "./columns/visibility";
import { TableBody } from "./components/TableBody";
import { type EmptyAction, TableEmpty } from "./components/TableEmpty";
import { TableToolbar } from "./components/TableToolbar";
import { useColumnDefs } from "./hooks/useColumnDefs";
import { useHeaderMenuActions } from "./hooks/useHeaderMenuActions";
import { usePlayerSearch } from "./hooks/usePlayerSearch";
import { useTableSorting } from "./hooks/useTableSorting";
import type { ColumnActions } from "./lib/columnActions";
import { downloadCsv, toCsv } from "./lib/csv";
import type { SelectionAction } from "./lib/selectionActions";
import { features, type NameCellWrap, type RowRef } from "./lib/tableModel";

export interface PlayerTableViewProps {
  rows: Uint32Array;
  players: readonly PlayerRecord[];
  analysis: AnalysisResult;
  composites: readonly Composite[];
  mode: ValueMode;
  onModeChange(mode: ValueMode): void;
  columnState: TableColumnState;
  columnActions: ColumnActions;
  onOpenPlayer(uid: number): void;
  selectedUid?: number | null;
  columns?: readonly TableColumn[];
  total?: number;
  filtering?: ColumnFiltering;
  searchKey: SearchKey;
  position?: ReactNode;
  chips?: ReactNode;
  filterBar?: ReactNode;
  filtersPanel?: ReactNode;
  criteria?: ReactNode;
  scoring?: ReactNode;
  emptyActions?: readonly EmptyAction[];
  emptyDescription?: string;
  defaultSort?: { id: string; desc: boolean };
  selectionActions?: readonly SelectionAction[];
  nameCell?: NameCellWrap;
}

const NO_ROWS: RowRef[] = [];
const NO_ACTIONS: readonly EmptyAction[] = [];

export function PlayerTableView({
  rows,
  players,
  analysis,
  composites,
  mode,
  onModeChange,
  columnState,
  columnActions,
  onOpenPlayer,
  selectedUid = null,
  columns: prebuilt,
  total,
  filtering,
  searchKey,
  position,
  chips,
  filterBar,
  filtersPanel,
  criteria,
  scoring,
  emptyActions = NO_ACTIONS,
  emptyDescription,
  defaultSort,
  selectionActions,
  nameCell,
}: PlayerTableViewProps) {
  const { t } = useTranslation("table");
  const columns = useMemo(
    () => prebuilt ?? buildColumns({ players, analysis, composites }),
    [prebuilt, players, analysis, composites],
  );
  const columnDefs = useColumnDefs(columns, mode);
  const byId = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);
  const { group, presets, groups, fixed, lead } = columnState;
  const visibleIds = useMemo(
    () => visibleColumnIds(columns, { group, presets, groups, fixed, lead }),
    [columns, group, presets, groups, fixed, lead],
  );
  const columnVisibility = useMemo(() => {
    const shown = new Set(visibleIds);
    return Object.fromEntries(columns.map((c) => [c.id, shown.has(c.id)]));
  }, [columns, visibleIds]);

  const { sorting, chosenSort, setChosenSort } = useTableSorting({
    byId,
    visibleIds,
    columnVisibility,
    columnState,
    defaultSort,
    mode,
  });

  const table = useTable({
    features,
    columns: columnDefs,
    data: NO_ROWS,
    state: { columnVisibility, columnOrder: visibleIds, sorting },
    onSortingChange: (updater: Updater<SortingState>) => setChosenSort(functionalUpdate(updater, sorting)),
    manualSorting: true,
    enableMultiSort: false,
    enableSortingRemoval: true,
  });

  const visibleColumns = useMemo(
    () =>
      visibleIds.flatMap((id) => {
        const column = byId.get(id);
        return column ? [column] : [];
      }),
    [visibleIds, byId],
  );

  const { query, terms, searched } = usePlayerSearch(rows, players, searchKey);

  const sort = sorting[0];
  const sortKey = sort ? byId.get(sort.id)?.sortKey(mode) : undefined;
  const sortDesc = sort?.desc;
  const sortedRows = useMemo(
    () => (sortKey && sortDesc !== undefined ? sortRows(searched, sortKey, sortDesc) : searched),
    [searched, sortKey, sortDesc],
  );

  const exportCsv = () =>
    downloadCsv(toCsv(sortedRows, visibleColumns, mode), playersCsvName(mode === VALUE_MODE.percentile));

  const tableRef = useRef<HTMLTableElement>(null);
  const [menuHandle] = useState(createHeaderMenuHandle);
  const menuActions = useHeaderMenuActions({
    byId,
    tableRef,
    sorting,
    chosenSort,
    setChosenSort,
    columnState,
    columnActions,
    filtering,
  });

  const listed = searched.length;
  const searchEmptied = terms.length > 0 && rows.length > 0;
  const clearSearch = { label: t("search.clear"), onClick: () => appStore.getState().setSearch(searchKey, "") };
  const ways = searchEmptied ? [clearSearch, ...emptyActions] : emptyActions;

  return (
    <section aria-label={t("view.region")} className="flex min-h-0 min-w-0 flex-1 flex-col">
      <TableToolbar
        searchKey={searchKey}
        listed={listed}
        of={total ?? rows.length}
        columns={columns}
        columnState={columnState}
        columnActions={columnActions}
        mode={mode}
        onModeChange={onModeChange}
        onExport={exportCsv}
        position={position}
        filtersPanel={filtersPanel}
        chips={chips}
        filterBar={filterBar}
        criteria={criteria}
        scoring={scoring}
      />
      <TableBody
        table={table}
        tableRef={tableRef}
        rows={sortedRows}
        filtered={searched}
        sorting={sorting}
        players={players}
        columns={visibleColumns}
        mode={mode}
        selectedUid={selectedUid}
        onOpenPlayer={onOpenPlayer}
        menuHandle={menuHandle}
        menuActions={menuActions}
        filtering={filtering}
        selectionActions={selectionActions}
        nameCell={nameCell}
        empty={
          listed === 0 && (
            <TableEmpty
              query={searchEmptied ? query : null}
              description={emptyDescription ?? t("empty.filtered")}
              ways={ways}
            />
          )
        }
      />
    </section>
  );
}
