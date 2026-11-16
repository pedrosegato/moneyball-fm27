import { memo } from "react";
import { HeaderMenuButton } from "@/filters/components/HeaderMenuButton";
import type { HeaderMenuHandle } from "@/filters/lib/headerMenuHandle";
import { cn } from "@/lib/utils";
import { NAME_COLUMN } from "../columns/ids";
import { alignsEnd, ariaSort, type Sorted } from "../lib/header";
import { HEADER_SLOT, type HeaderSlot, headerColumn, type TableHeader } from "../lib/tableModel";
import { GroupCaption } from "./GroupCaption";
import { SortButton } from "./SortButton";

interface HeaderCellProps {
  header: TableHeader;
  colIndex: number;
  left: number;
  gap: number;
  caption: string | undefined;
  captionLeft: number;
  captionWidth: number;
  sorted: Sorted;
  filtered: boolean;
  stopSlot: HeaderSlot | null;
  menuHandle: HeaderMenuHandle;
}

export const HeaderCell = memo(function HeaderCell({
  header,
  colIndex,
  left,
  gap,
  caption,
  captionLeft,
  captionWidth,
  sorted,
  filtered,
  stopSlot,
  menuHandle,
}: HeaderCellProps) {
  const column = headerColumn(header);
  const isName = column.id === NAME_COLUMN;
  const end = alignsEnd(column);
  return (
    <th
      scope="col"
      data-column-id={column.id}
      aria-colindex={colIndex}
      aria-sort={ariaSort(sorted)}
      style={{ width: header.getSize(), marginInlineStart: gap || undefined, left: isName ? left : undefined }}
      className={cn(
        "group/header flex h-full flex-none items-end bg-surface-canvas p-0 font-normal shadow-[inset_0_-1px_0_var(--line)]",
        isName ? "sticky z-10 shadow-[inset_-1px_0_0_var(--line-subtle),inset_0_-1px_0_var(--line)]" : "relative",
      )}
    >
      {caption && <GroupCaption caption={caption} left={captionLeft} width={captionWidth} />}
      <SortButton
        header={header}
        column={column}
        isName={isName}
        end={end}
        sorted={sorted}
        filtered={filtered}
        tabbable={stopSlot === HEADER_SLOT.sort}
      />
      <HeaderMenuButton
        handle={menuHandle}
        column={column}
        filtered={filtered}
        side={end ? "start" : "end"}
        tabIndex={stopSlot === HEADER_SLOT.menu ? 0 : -1}
      />
    </th>
  );
});
