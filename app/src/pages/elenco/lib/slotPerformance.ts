import { COLUMN } from "@/engine/columnIds";
import { chip } from "@/table/columns/factories";
import type { TableColumn } from "@/table/columns/types";
import { PERFORMANCE_ROLE } from "@/table/presets";
import { elencoT } from "./elencoT";

export function withSlotPerformance(
  base: readonly TableColumn[],
  value: ArrayLike<number>,
  pool: ArrayLike<number>,
): TableColumn[] {
  return base.flatMap((column): TableColumn[] => {
    if (column.id === PERFORMANCE_ROLE) return [];
    if (column.id !== COLUMN.perf || column.kind !== "chip") return [column];
    const description = elencoT("slotColumns.slotPerf.description");
    return [
      {
        ...chip(
          {
            id: column.id,
            abbr: column.abbr,
            def: { ...column.def, label: elencoT("slotColumns.slotPerf.label"), description },
            group: column.group,
            value,
            pct: value,
            against: column.against,
          },
          pool,
        ),
        local: true,
      },
    ];
  });
}
