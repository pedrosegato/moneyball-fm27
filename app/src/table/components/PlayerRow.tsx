import { memo } from "react";
import { EMPTY_VALUE } from "@/lib/constants";
import type { ValueMode } from "@/store/ui";
import type { TableColumn } from "../columns/types";
import {
  cellText,
  type NameCellWrap,
  ROW_HEIGHT,
  type RowEvents,
  SELECT_WIDTH,
  type WindowColumn,
} from "../lib/tableModel";
import { BodyCell } from "./BodyCell";
import { NameCell } from "./NameCell";
import { RowCheck } from "./RowCheck";

interface RowProps {
  i: number;
  uid: number;
  position: number;
  lead: TableColumn;
  shown: readonly WindowColumn[];
  mode: ValueMode;
  selected: boolean;
  tabbable: boolean;
  selectable: boolean;
  checked: boolean;
  nameCell?: NameCellWrap;
  events: RowEvents;
}

export const PlayerRow = memo(function PlayerRow({
  i,
  uid,
  position,
  lead,
  shown,
  mode,
  selected,
  tabbable,
  selectable,
  checked,
  nameCell,
  events,
}: RowProps) {
  const offset = selectable ? 1 : 0;
  return (
    <tr
      data-player={uid}
      data-position={position}
      data-selected={selected || undefined}
      data-checked={checked || undefined}
      data-odd={position % 2 === 1 || undefined}
      aria-selected={selectable ? checked : undefined}
      aria-rowindex={position + 2}
      tabIndex={tabbable ? 0 : -1}
      style={{ height: ROW_HEIGHT, transform: `translateY(${position * ROW_HEIGHT}px)` }}
      onClick={events.onClick}
      onMouseDown={events.onMouseDown}
      onKeyDown={events.onKeyDown}
      className="absolute top-0 left-0 flex w-full cursor-default outline-none player-row row-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      {selectable && <RowCheck checked={checked} name={cellText(lead, i) ?? EMPTY_VALUE} />}
      <NameCell column={lead} i={i} uid={uid} left={selectable ? SELECT_WIDTH : 0} active={tabbable} wrap={nameCell} />
      {shown.map((s) => (
        <BodyCell
          key={s.column.id}
          column={s.column}
          colIndex={s.index + 1 + offset}
          gap={s.gap}
          i={i}
          mode={mode}
          active={tabbable}
        />
      ))}
    </tr>
  );
});
