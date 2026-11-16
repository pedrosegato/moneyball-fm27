import { EMPTY_VALUE } from "@/lib/constants";
import type { TableColumn } from "../columns/types";
import { cellText, type NameCellWrap } from "../lib/tableModel";

interface NameCellProps {
  column: TableColumn;
  i: number;
  uid: number;
  left: number;
  active: boolean;
  wrap?: NameCellWrap;
}

export function NameCell({ column, i, uid, left, active, wrap }: NameCellProps) {
  const name = cellText(column, i) ?? EMPTY_VALUE;
  const caption = column.kind === "text" ? column.caption?.(i) : undefined;
  const cell = (
    <>
      <span className="block truncate leading-[18px] font-[550] text-fg" title={name}>
        {name}
      </span>
      {caption != null && (
        <span className="block truncate type-caption text-fg-muted" title={caption}>
          {caption}
        </span>
      )}
    </>
  );
  return (
    <th
      scope="row"
      data-column-id={column.id}
      aria-colindex={left ? 2 : 1}
      style={{ width: column.width, left }}
      className="sticky z-10 flex h-full flex-none flex-col justify-center gap-[3px] px-3 text-left font-normal row-fill shadow-[inset_-1px_0_0_var(--line-subtle)]"
    >
      {wrap ? wrap(uid, cell, active) : cell}
    </th>
  );
}
