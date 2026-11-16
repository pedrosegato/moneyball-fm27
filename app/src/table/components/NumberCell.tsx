import { EMPTY_VALUE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { NumberColumn } from "../columns/types";
import { CELL, type CellProps } from "../lib/cells";
import { cellText } from "../lib/tableModel";
import { MissingNumber } from "./MissingNumber";

export function NumberCell({ column, colIndex, style, i }: CellProps<NumberColumn>) {
  const text = cellText(column, i);
  const reason = text == null ? column.emptyReason?.(i) : undefined;
  return (
    <td
      data-column-id={column.id}
      aria-colindex={colIndex}
      style={style}
      className={cn(CELL, "justify-end px-2 text-fg-secondary")}
    >
      {reason ? <MissingNumber label={column.label} reason={reason} /> : (text ?? EMPTY_VALUE)}
    </td>
  );
}
