import type { Virtualizer } from "@tanstack/react-virtual";
import { type FocusEvent, type KeyboardEvent, type RefObject, useLayoutEffect, useRef } from "react";
import type { TableColumn } from "../columns/types";
import { HEADER_CELL, HEADER_CONTROL, headerCellOf, headerControlOf } from "../lib/domSelectors";
import { HEADER_SLOT, type HeaderSlot, type HeaderStop, SELECT_COLUMN } from "../lib/tableModel";

function stopOf(target: EventTarget): HeaderStop | null {
  const control = (target as HTMLElement).closest<HTMLElement>(HEADER_CONTROL);
  const col = control?.closest<HTMLElement>(HEADER_CELL)?.dataset.columnId;
  return control && col ? { col, slot: control.dataset.headerSlot as HeaderSlot } : null;
}

function headerOrder(columns: readonly TableColumn[], selectable: boolean): HeaderStop[] {
  return [
    ...(selectable ? [{ col: SELECT_COLUMN, slot: HEADER_SLOT.select }] : []),
    ...columns.flatMap((c) => [
      { col: c.id, slot: HEADER_SLOT.sort },
      { col: c.id, slot: HEADER_SLOT.menu },
    ]),
  ];
}

interface HeaderKeysOptions {
  columns: readonly TableColumn[];
  selectable: boolean;
  stop: HeaderStop;
  stopIndex: number;
  setHeaderStop(stop: HeaderStop): void;
  tableRef: RefObject<HTMLTableElement | null>;
  columnVirtualizer: Virtualizer<HTMLDivElement, Element>;
}

export function useHeaderKeys({
  columns,
  selectable,
  stop,
  stopIndex,
  setHeaderStop,
  tableRef,
  columnVirtualizer,
}: HeaderKeysOptions) {
  const pendingHeaderFocus = useRef<HeaderStop | null>(null);

  useLayoutEffect(() => {
    const target = pendingHeaderFocus.current;
    if (target === null) return;
    pendingHeaderFocus.current = null;
    const th = tableRef.current?.querySelector(headerCellOf(target.col));
    th?.querySelector<HTMLElement>(headerControlOf(target.slot))?.focus({ preventScroll: true });
    if (stopIndex >= 0) columnVirtualizer.scrollToIndex(stopIndex, { align: "auto" });
  });

  const onHeaderFocus = (e: FocusEvent) => {
    const at = stopOf(e.target);
    if (at && (at.col !== stop.col || at.slot !== stop.slot)) setHeaderStop(at);
  };

  const onHeaderKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    const at = stopOf(e.target);
    if (!at) return;
    const order = headerOrder(columns, selectable);
    const k = order.findIndex((o) => o.col === at.col && o.slot === at.slot);
    const moves: Record<string, number> = { ArrowLeft: k - 1, ArrowRight: k + 1, Home: 0, End: order.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = order[Math.max(0, Math.min(order.length - 1, moves[e.key]))];
    pendingHeaderFocus.current = next;
    setHeaderStop(next);
  };

  return { onHeaderFocus, onHeaderKeyDown };
}
