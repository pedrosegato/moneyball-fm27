import { STAT_GROUPS } from "@/engine/stats/groups";
import type { ColumnsSlice } from "@/store/columns";
import { COLUMN_GROUP } from "../columns/ids";
import type { ColumnGroup, TableColumnState } from "../columns/types";
import { defaultColumnsFor, presetKeyOf } from "../presets";
import { tableText } from "./tableText";

export type ColumnActions = Pick<ColumnsSlice, "setColumnPreset" | "resetColumnPreset" | "setColumnGroups">;

export interface ColumnGroupInfo {
  id: ColumnGroup;
  label: string;
}

export const columnGroups = (): readonly ColumnGroupInfo[] => [
  { id: COLUMN_GROUP.identity, label: tableText("columns.player") },
  ...STAT_GROUPS,
];

export function setColumnShown(state: TableColumnState, actions: ColumnActions, id: string, shown: boolean): void {
  const key = presetKeyOf(state.group);
  const preset = state.presets[key] ?? defaultColumnsFor(state.group);
  actions.setColumnPreset(key, shown ? [...preset, id] : preset.filter((c) => c !== id));
}
