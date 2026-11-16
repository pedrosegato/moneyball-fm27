import { cn } from "@/lib/utils";
import type { CustomColumn } from "../columns/types";
import { CELL, type CellProps } from "../lib/cells";

export function CustomCell({ column, colIndex, style, i, active }: CellProps<CustomColumn> & { active: boolean }) {
  return (
    <td
      data-column-id={column.id}
      aria-colindex={colIndex}
      style={style}
      className={cn(CELL, "min-w-0 gap-2 px-2", column.align === "end" && "justify-end")}
    >
      {column.render(i, active)}
    </td>
  );
}
