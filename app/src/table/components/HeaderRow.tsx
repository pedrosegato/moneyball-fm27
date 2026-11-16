import type { SortingState } from "@tanstack/react-table";
import { memo, useMemo } from "react";
import type { ColumnFiltering } from "@/filters/lib/headerMenu";
import type { HeaderMenuHandle } from "@/filters/lib/headerMenuHandle";
import { groupCaption } from "../lib/captions";
import { captionRuns, sortedAs } from "../lib/header";
import type { HeaderCheck } from "../lib/selection";
import {
  HEADER_HEIGHT,
  HEADER_SLOT,
  type HeaderStop,
  headerColumn,
  SELECT_WIDTH,
  type TableHeader,
  type WindowColumn,
} from "../lib/tableModel";
import { HeaderCell } from "./HeaderCell";
import { SelectHeader } from "./SelectHeader";

interface HeaderRowProps {
  headers: readonly TableHeader[];
  shown: readonly WindowColumn[];
  sorting: SortingState;
  menuHandle: HeaderMenuHandle;
  filtering: ColumnFiltering | undefined;
  stop: HeaderStop;
  selectable: boolean;
  check: HeaderCheck;
  empty: boolean;
  onToggleAll(): void;
}

export const HeaderRow = memo(function HeaderRow({
  headers,
  shown,
  sorting,
  menuHandle,
  filtering,
  stop,
  selectable,
  check,
  empty,
  onToggleAll,
}: HeaderRowProps) {
  const runs = useMemo(() => captionRuns(headers), [headers]);
  const sort = sorting[0];
  const mounted = headers.length ? [0, ...shown.map((s) => s.index)] : [];
  const offset = selectable ? 1 : 0;

  return (
    <tr aria-rowindex={1} className="flex w-full" style={{ height: HEADER_HEIGHT }}>
      {selectable && (
        <SelectHeader
          check={check}
          tabbable={stop.slot === HEADER_SLOT.select}
          empty={empty}
          onToggleAll={onToggleAll}
        />
      )}
      {mounted.map((k, n) => {
        const header = headers[k];
        const column = headerColumn(header);
        const firstOfRun = n === 0 || runs.runStart[mounted[n - 1]] !== runs.runStart[k];
        const captionWidth = runs.runWidth[k] - 8;
        const caption = firstOfRun ? groupCaption(column.group, captionWidth) : undefined;
        return (
          <HeaderCell
            key={header.id}
            header={header}
            colIndex={k + 1 + offset}
            left={selectable ? SELECT_WIDTH : 0}
            gap={n === 0 ? 0 : shown[n - 1].gap}
            caption={caption}
            captionLeft={4 + runs.x[runs.runStart[k]] - runs.x[k]}
            captionWidth={captionWidth}
            sorted={sortedAs(sort, column.id)}
            filtered={!!filtering?.stateOf(column).active}
            stopSlot={stop.col === column.id ? stop.slot : null}
            menuHandle={menuHandle}
          />
        );
      })}
    </tr>
  );
});
