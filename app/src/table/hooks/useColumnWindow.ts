import { type Range, useVirtualizer } from "@tanstack/react-virtual";
import { type RefObject, useCallback, useMemo, useState } from "react";
import type { TableColumn } from "../columns/types";
import { COLUMN_BLOCK, COLUMN_OVERSCAN, type WindowColumn } from "../lib/tableModel";

function columnStarts(rest: readonly TableColumn[], leadWidth: number): number[] {
  let at = leadWidth;
  return rest.map((c) => {
    const start = at;
    at += c.width;
    return start;
  });
}

function useWindowKey(measured: string | null): string {
  const [laidOut, setLaidOut] = useState("");
  if (measured !== null && measured !== laidOut) setLaidOut(measured);
  return measured ?? laidOut;
}

export function useColumnWindow(
  rest: readonly TableColumn[],
  leadWidth: number,
  stopIndex: number,
  scrollerRef: RefObject<HTMLDivElement | null>,
) {
  const starts = useMemo(() => columnStarts(rest, leadWidth), [rest, leadWidth]);

  const columnRange = useCallback(
    (range: Range) => {
      const first = Math.floor(Math.max(0, range.startIndex - range.overscan) / COLUMN_BLOCK) * COLUMN_BLOCK;
      const last = Math.min(
        range.count - 1,
        Math.ceil((range.endIndex + range.overscan + 1) / COLUMN_BLOCK) * COLUMN_BLOCK - 1,
      );
      const indexes = Array.from({ length: last - first + 1 }, (_, k) => first + k);
      if (stopIndex < 0 || indexes.includes(stopIndex)) return indexes;
      return stopIndex < first ? [stopIndex, ...indexes] : [...indexes, stopIndex];
    },
    [stopIndex],
  );
  const columnKey = useCallback((k: number) => rest[k]?.id ?? k, [rest]);
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: rest.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize: (k) => rest[k]?.width ?? 0,
    getItemKey: columnKey,
    paddingStart: leadWidth,
    scrollPaddingStart: leadWidth,
    overscan: COLUMN_OVERSCAN,
    rangeExtractor: columnRange,
    initialRect: { width: window.innerWidth, height: window.innerHeight },
  });

  const windowKey = useWindowKey(
    (columnVirtualizer.scrollRect?.width ?? 0) > 0 ? columnVirtualizer.getVirtualIndexes().join() : null,
  );
  const shown = useMemo<WindowColumn[]>(() => {
    const keep = windowKey
      ? windowKey
          .split(",")
          .map(Number)
          .filter((k) => k < rest.length)
      : rest.map((_, k) => k);
    return keep.map((k, n) => {
      const previous = n ? keep[n - 1] : -1;
      const end = previous < 0 ? leadWidth : starts[previous] + rest[previous].width;
      return { column: rest[k], index: k + 1, gap: starts[k] - end };
    });
  }, [windowKey, rest, starts, leadWidth]);

  return { columnVirtualizer, shown };
}
