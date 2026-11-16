import { useMemo } from "react";
import { VALUE_MODE, type ValueMode } from "@/store/ui";
import { NAME_COLUMN } from "../columns/ids";
import type { TableColumn } from "../columns/types";
import { helper } from "../lib/tableModel";

export function useColumnDefs(columns: readonly TableColumn[], mode: ValueMode) {
  return useMemo(
    () =>
      helper.columns(
        columns.map((column) =>
          helper.accessor((row) => column.sortKey(VALUE_MODE.value)[row.index], {
            id: column.id,
            header: column.abbr,
            size: column.width,
            sortDescFirst: column.descFirst(mode),
            enableHiding: column.id !== NAME_COLUMN,
            meta: { column },
          }),
        ),
      ),
    [columns, mode],
  );
}
