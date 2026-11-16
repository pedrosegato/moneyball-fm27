import { COLUMN, percentileColumn } from "@/engine/columnIds";
import type { FilterSpec } from "@/engine/universe";
import { VALUE_MODE, VALUE_MODES, type ValueMode } from "@/store/ui";
import { NAME_COLUMN, PLAYER_COLUMN } from "@/table/columns/ids";
import type { TableColumn } from "@/table/columns/types";

export interface FilterTarget {
  column: TableColumn;
  col: string;
  kind: FilterSpec["kind"];
  percentile: boolean;
}

export const LIST_COLUMNS = {
  [PLAYER_COLUMN.position]: COLUMN.naturalPositions,
  [PLAYER_COLUMN.club]: PLAYER_COLUMN.club,
  [PLAYER_COLUMN.division]: PLAYER_COLUMN.division,
  [PLAYER_COLUMN.nation]: PLAYER_COLUMN.nation,
  [PLAYER_COLUMN.foot]: PLAYER_COLUMN.foot,
} as const;
export type ListColumn = (typeof LIST_COLUMNS)[keyof typeof LIST_COLUMNS];

const RANGE_COLUMNS: Readonly<Record<string, string>> = { [PLAYER_COLUMN.value]: COLUMN.marketValue };

const isListed = (id: string): id is keyof typeof LIST_COLUMNS => id in LIST_COLUMNS;

function target(column: TableColumn, col: string, kind: FilterTarget["kind"], percentile = false): FilterTarget {
  return { column, col, kind, percentile };
}

export function filterTarget(column: TableColumn, mode: ValueMode): FilterTarget | null {
  if (column.id === NAME_COLUMN || column.local || column.kind === "custom") return null;
  if (isListed(column.id)) return target(column, LIST_COLUMNS[column.id], "set");
  if (column.id === PLAYER_COLUMN.contractEnd) return target(column, column.id, "dateRange");
  if (column.kind === "text") return null;
  if (column.kind === "chip" && mode === VALUE_MODE.percentile && column.pct !== column.value) {
    return target(column, percentileColumn(column.id), "range", true);
  }
  return target(column, RANGE_COLUMNS[column.id] ?? column.id, "range");
}

export const filterCols = (column: TableColumn): string[] => [
  ...new Set(VALUE_MODES.flatMap((mode) => filterTarget(column, mode)?.col ?? [])),
];

export function filterTargets(columns: readonly TableColumn[]): Map<string, FilterTarget> {
  const targets = new Map<string, FilterTarget>();
  for (const column of columns) {
    for (const mode of VALUE_MODES) {
      const t = filterTarget(column, mode);
      if (t && !targets.has(t.col)) targets.set(t.col, t);
    }
  }
  return targets;
}
