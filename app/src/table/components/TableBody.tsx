import type { SortingState } from "@tanstack/react-table";
import { type ReactNode, type RefObject, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { PlayerRecord } from "@/data/types";
import { HeaderContextTrigger } from "@/filters/components/HeaderContextTrigger";
import { HeaderMenus } from "@/filters/components/HeaderMenus";
import type { ColumnFiltering, HeaderMenuActions } from "@/filters/lib/headerMenu";
import type { HeaderMenuHandle } from "@/filters/lib/headerMenuHandle";
import { cn } from "@/lib/utils";
import type { ValueMode } from "@/store/ui";
import type { TableColumn } from "../columns/types";
import { useColumnWindow } from "../hooks/useColumnWindow";
import { useHeaderKeys } from "../hooks/useHeaderKeys";
import { useHeaderStop } from "../hooks/useHeaderStop";
import { useRowNavigation } from "../hooks/useRowNavigation";
import { useRowSelection } from "../hooks/useRowSelection";
import { TABBABLE_ROW, TOOLBAR } from "../lib/domSelectors";
import type { SelectionAction } from "../lib/selectionActions";
import {
  type NameCellWrap,
  type PlayerReactTable,
  ROW_HEIGHT,
  SELECT_WIDTH,
  type TableHeader,
} from "../lib/tableModel";
import { HeaderRow } from "./HeaderRow";
import { PlayerRow } from "./PlayerRow";
import { SelectionBar } from "./SelectionBar";

const NO_HEADERS: TableHeader[] = [];

interface TableBodyProps {
  table: PlayerReactTable;
  tableRef: RefObject<HTMLTableElement | null>;
  rows: Uint32Array;
  filtered: Uint32Array;
  sorting: SortingState;
  players: readonly PlayerRecord[];
  columns: readonly TableColumn[];
  mode: ValueMode;
  selectedUid: number | null;
  onOpenPlayer(uid: number): void;
  menuHandle: HeaderMenuHandle;
  menuActions: HeaderMenuActions;
  filtering: ColumnFiltering | undefined;
  selectionActions: readonly SelectionAction[] | undefined;
  nameCell: NameCellWrap | undefined;
  empty: ReactNode;
}

export function TableBody({
  table,
  tableRef,
  rows,
  filtered,
  sorting,
  players,
  columns,
  mode,
  selectedUid,
  onOpenPlayer,
  menuHandle,
  menuActions,
  filtering,
  selectionActions,
  nameCell,
  empty,
}: TableBodyProps) {
  const { t } = useTranslation("table");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTableSectionElement>(null);

  const selectable = selectionActions !== undefined;
  const selectWidth = selectable ? SELECT_WIDTH : 0;
  const selection = useRowSelection(rows, players, selectable);
  const { selected, toggle: toggleRow, toggleAll, clear: clearSelection } = selection;
  const onClearBar = useCallback(() => {
    clearSelection();
    if (document.activeElement?.closest(TOOLBAR)) {
      bodyRef.current?.querySelector<HTMLElement>(TABBABLE_ROW)?.focus({ preventScroll: true });
    }
  }, [clearSelection]);

  const { virtualizer, activeRow, events } = useRowNavigation({
    rows,
    filtered,
    sortId: sorting[0]?.id,
    sortDesc: sorting[0]?.desc,
    players,
    selectable,
    toggleRow,
    onOpenPlayer,
    scrollerRef,
    bodyRef,
  });

  const lead = columns[0];
  const rest = useMemo(() => columns.slice(1), [columns]);
  const leadWidth = (lead?.width ?? 0) + selectWidth;
  const { stop, stopIndex, setHeaderStop } = useHeaderStop(rest, selectable);
  const { columnVirtualizer, shown } = useColumnWindow(rest, leadWidth, stopIndex, scrollerRef);
  const { onHeaderFocus, onHeaderKeyDown } = useHeaderKeys({
    columns,
    selectable,
    stop,
    stopIndex,
    setHeaderStop,
    tableRef,
    columnVirtualizer,
  });

  const items = virtualizer.getVirtualItems();
  const totalWidth = table.getTotalSize() + selectWidth;

  return (
    <HeaderMenus handle={menuHandle} actions={menuActions}>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollerRef}
          className={cn("relative min-h-0 flex-1 overflow-auto overscroll-contain", selected.size > 0 && "pb-16")}
        >
          <table
            ref={tableRef}
            aria-label={t("view.grid")}
            aria-rowcount={rows.length + 1}
            aria-colcount={columns.length + (selectable ? 1 : 0)}
            className="grid border-separate border-spacing-0"
            style={{ width: totalWidth }}
          >
            <HeaderContextTrigger>
              <thead
                className="sticky top-0 z-20 grid bg-surface-canvas"
                onFocus={onHeaderFocus}
                onKeyDown={onHeaderKeyDown}
              >
                <HeaderRow
                  headers={table.getHeaderGroups()[0]?.headers ?? NO_HEADERS}
                  shown={shown}
                  sorting={sorting}
                  menuHandle={menuHandle}
                  filtering={filtering}
                  stop={stop}
                  selectable={selectable}
                  check={selection.check}
                  empty={rows.length === 0}
                  onToggleAll={toggleAll}
                />
              </thead>
            </HeaderContextTrigger>
            <tbody
              ref={bodyRef}
              data-testid="player-rows"
              className="relative grid"
              style={{ height: rows.length * ROW_HEIGHT }}
            >
              {items.map((item) => {
                const i = rows[item.index];
                const uid = players[i].uid;
                return (
                  <PlayerRow
                    key={uid}
                    i={i}
                    uid={uid}
                    position={item.index}
                    lead={lead}
                    shown={shown}
                    mode={mode}
                    selected={uid === selectedUid}
                    tabbable={item.index === activeRow}
                    selectable={selectable}
                    checked={selected.has(uid)}
                    nameCell={nameCell}
                    events={events}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
        {empty && (
          <div className="pointer-events-none absolute inset-x-0 top-10 bottom-0 grid place-items-center">
            <div className="pointer-events-auto">{empty}</div>
          </div>
        )}
        {selectionActions && (
          <SelectionBar
            selected={selected}
            players={players}
            inView={selection.inView}
            actions={selectionActions}
            leaveAtOnce={selection.leaveAtOnce}
            onClear={onClearBar}
            onDone={selection.clearAfterAction}
          />
        )}
      </div>
    </HeaderMenus>
  );
}
