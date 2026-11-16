import { StatCell } from "@/components/StatCell";
import { cn } from "@/lib/utils";
import type { ValueMode } from "@/store/ui";
import type { ChipColumn } from "../columns/types";
import { CELL, type CellProps } from "../lib/cells";

export function ChipCell({ column, colIndex, style, i, mode }: CellProps<ChipColumn> & { mode: ValueMode }) {
  return (
    <td data-column-id={column.id} aria-colindex={colIndex} style={style} className={cn(CELL, "justify-end px-2")}>
      <StatCell
        value={column.value[i]}
        pct={column.pct[i]}
        mode={mode}
        def={column.def}
        missing={column.missing(i)}
        scale={column.scale}
        against={column.against?.(i)}
        againstAsTitle
      />
    </td>
  );
}
