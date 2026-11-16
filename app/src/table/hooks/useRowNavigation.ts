import { defaultRangeExtractor, type Range, useVirtualizer } from "@tanstack/react-virtual";
import {
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PlayerRecord } from "@/data/types";
import { POSITIONED_ROW, ROW_CHECK, ROW_CONTROL, rowAt } from "../lib/domSelectors";
import { HEADER_HEIGHT, OVERSCAN, pageRows, ROW_HEIGHT, type RowEvents } from "../lib/tableModel";

interface RowNavigationOptions {
  rows: Uint32Array;
  filtered: Uint32Array;
  sortId: string | undefined;
  sortDesc: boolean | undefined;
  players: readonly PlayerRecord[];
  selectable: boolean;
  toggleRow(uid: number, range: boolean): void;
  onOpenPlayer(uid: number): void;
  scrollerRef: RefObject<HTMLDivElement | null>;
  bodyRef: RefObject<HTMLTableSectionElement | null>;
}

function positionOf(target: EventTarget): number | null {
  const element = target as HTMLElement;
  const row = element.closest<HTMLElement>(POSITIONED_ROW);
  const control = element.closest(ROW_CONTROL);
  if (!row || (control && control !== row && row.contains(control) && !control.closest(ROW_CHECK))) return null;
  return Number(row.dataset.position);
}

function useActiveRow(
  rows: Uint32Array,
  filtered: Uint32Array,
  sortId: string | undefined,
  sortDesc: boolean | undefined,
) {
  const [active, setActive] = useState(0);
  const [order, setOrder] = useState({ filtered, sortId, sortDesc });
  if (order.filtered !== filtered || order.sortId !== sortId || order.sortDesc !== sortDesc) {
    setOrder({ filtered, sortId, sortDesc });
    setActive(0);
  }
  return { activeRow: Math.min(active, rows.length - 1), setActive, order };
}

export function useRowNavigation({
  rows,
  filtered,
  sortId,
  sortDesc,
  players,
  selectable,
  toggleRow,
  onOpenPlayer,
  scrollerRef,
  bodyRef,
}: RowNavigationOptions) {
  const { activeRow, setActive, order } = useActiveRow(rows, filtered, sortId, sortDesc);
  const pendingFocus = useRef<number | null>(null);
  const scrolledFor = useRef<typeof order | null>(null);

  const rangeExtractor = useCallback(
    (range: Range) => {
      const indexes = defaultRangeExtractor(range);
      if (activeRow < 0 || indexes.includes(activeRow)) return indexes;
      return activeRow < indexes[0] ? [activeRow, ...indexes] : [...indexes, activeRow];
    },
    [activeRow],
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => ROW_HEIGHT,
    paddingStart: HEADER_HEIGHT,
    scrollPaddingStart: HEADER_HEIGHT,
    overscan: OVERSCAN,
    rangeExtractor,
  });

  useLayoutEffect(() => {
    if (scrolledFor.current === order) return;
    scrolledFor.current = order;
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
  }, [order, scrollerRef]);

  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    bodyRef.current?.querySelector<HTMLElement>(rowAt(target))?.focus({ preventScroll: true });
  });

  const events = useMemo<RowEvents>(() => {
    const goTo = (position: number) => {
      const next = Math.max(0, Math.min(rows.length - 1, position));
      pendingFocus.current = next;
      setActive(next);
      virtualizer.scrollToIndex(next, { align: "auto" });
    };
    return {
      onClick: (e: MouseEvent) => {
        const position = positionOf(e.target);
        if (position === null) return;
        setActive(position);
        const uid = players[rows[position]].uid;
        if (selectable && (e.target as HTMLElement).closest(ROW_CHECK)) toggleRow(uid, e.shiftKey);
        else onOpenPlayer(uid);
      },
      onMouseDown: (e: MouseEvent<HTMLElement>) => {
        if (!(e.target as HTMLElement).closest(ROW_CHECK)) return;
        e.preventDefault();
        if (!e.shiftKey) e.currentTarget.focus({ preventScroll: true });
      },
      onKeyDown: (e: KeyboardEvent) => {
        const position = positionOf(e.target);
        if (position === null) return;
        const page = pageRows(scrollerRef.current?.clientHeight ?? 0);
        const moves: Record<string, number> = {
          ArrowDown: position + 1,
          ArrowUp: position - 1,
          PageDown: position + page,
          PageUp: position - page,
          Home: 0,
          End: rows.length - 1,
        };
        if (selectable && e.key === " ") {
          e.preventDefault();
          toggleRow(players[rows[position]].uid, e.shiftKey);
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenPlayer(players[rows[position]].uid);
        } else if (e.key in moves) {
          e.preventDefault();
          goTo(moves[e.key]);
        }
      },
    };
  }, [rows, players, selectable, toggleRow, onOpenPlayer, virtualizer, setActive, scrollerRef]);

  return { virtualizer, activeRow, events };
}
