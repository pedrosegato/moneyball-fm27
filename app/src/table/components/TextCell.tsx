import { EMPTY_VALUE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { TextColumn } from "../columns/types";
import { CELL, type CellProps } from "../lib/cells";
import { cellText } from "../lib/tableModel";

export function TextCell({ column, colIndex, style, i }: CellProps<TextColumn>) {
  const text = cellText(column, i);
  return (
    <td
      data-column-id={column.id}
      aria-colindex={colIndex}
      style={style}
      className={cn(CELL, "px-2 type-label text-fg-secondary")}
    >
      <span className="min-w-0 truncate" title={text ?? undefined}>
        {text ?? EMPTY_VALUE}
      </span>
    </td>
  );
}
