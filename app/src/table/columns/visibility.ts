import { STAT_GROUPS } from "@/engine/stats/groups";
import { defaultColumnsFor, IDENTITY_DEFAULTS, presetKeyOf } from "../presets";
import { COLUMN_GROUP, NAME_COLUMN } from "./ids";
import type { ColumnGroup, TableColumn, TableColumnState } from "./types";

export const viewColumns = ({ fixed = [], lead = [] }: TableColumnState): ReadonlySet<string> =>
  new Set([...lead, ...fixed]);

const isFact = (group: ColumnGroup | undefined) => group === COLUMN_GROUP.identity || group === COLUMN_GROUP.contract;

export function visibleColumnIds(
  columns: readonly TableColumn[],
  { group, presets, groups, fixed = [], lead = [] }: TableColumnState,
): string[] {
  const groupOf = new Map(columns.map((c) => [c.id, c.group]));
  const known = (ids: readonly string[]) => ids.filter((id) => groupOf.has(id));
  if (groups.length) {
    const shown = STAT_GROUPS.flatMap(({ id }) =>
      groups.includes(id) ? columns.flatMap((c) => (c.group === id ? [c.id] : [])) : [],
    );
    return [...new Set([NAME_COLUMN, ...known(lead), ...known(IDENTITY_DEFAULTS), ...known(fixed), ...shown])];
  }
  const preset = known(presets[presetKeyOf(group)] ?? defaultColumnsFor(group));
  let facts = 0;
  while (facts < preset.length && isFact(groupOf.get(preset[facts]))) facts++;
  const ids = new Set([
    NAME_COLUMN,
    ...known(lead),
    ...preset.slice(0, facts),
    ...known(fixed),
    ...preset.slice(facts),
  ]);
  return [...ids];
}
