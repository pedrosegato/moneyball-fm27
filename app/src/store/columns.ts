import type { StateCreator } from "zustand";
import { COLUMN } from "@/engine/columnIds";
import { POS_GROUPS, type PosGroup } from "@/engine/positions";
import { STAT_GROUP_IDS, type StatGroup } from "@/engine/stats/groups";
import type { AppState } from "./index";
import { fieldsOf, listOf, oneOf, text, uniqueBy } from "./sanitize";

export const ALL_GROUPS = "ALL";
export type GroupKey = PosGroup | typeof ALL_GROUPS;

export const COLUMN_PRESET_KEYS = [...POS_GROUPS, ALL_GROUPS] as const;
export type ColumnPresetKey = GroupKey;

const MAX_COLUMNS = 300;
const LAYOUT_VERSION = 4;
const ONE_PERFORMANCE_VERSION = 3;
const PERFORMANCE_ROLE = "perfRole";
const RETIRED_PERFORMANCE = /^(?:rolePerf|perf-[A-Z]+)$/;

function withOnePerformance(columns: string[]): string[] {
  const at = columns.findIndex((c) => c === COLUMN.perf || RETIRED_PERFORMANCE.test(c));
  const kept = columns.filter((c) => !RETIRED_PERFORMANCE.test(c) && c !== COLUMN.perf);
  if (at < 0) return kept;
  const before = columns.slice(0, at).filter((c) => !RETIRED_PERFORMANCE.test(c) && c !== COLUMN.perf).length;
  return [...kept.slice(0, before), COLUMN.perf, ...kept.slice(before)];
}

function withPerformanceRole(columns: string[]): string[] {
  const at = columns.indexOf(COLUMN.perf);
  if (at < 0 || columns.includes(PERFORMANCE_ROLE)) return columns;
  return [...columns.slice(0, at + 1), PERFORMANCE_ROLE, ...columns.slice(at + 1)];
}

export interface ColumnsState {
  presets: Partial<Record<ColumnPresetKey, string[]>>;
  groups: StatGroup[];
  layoutVersion?: number;
}

export interface ColumnsSlice {
  columns: ColumnsState;
  setColumnPreset(key: ColumnPresetKey, columns: string[]): void;
  resetColumnPreset(key: ColumnPresetKey): void;
  setColumnGroups(groups: StatGroup[]): void;
}

export const createColumnsSlice: StateCreator<AppState, [], [], ColumnsSlice> = (set) => ({
  columns: { presets: {}, groups: [], layoutVersion: LAYOUT_VERSION },
  setColumnPreset: (key, columns) =>
    set((s) => ({ columns: { ...s.columns, presets: { ...s.columns.presets, [key]: columns } } })),
  resetColumnPreset: (key) =>
    set((s) => {
      const { [key]: _reset, ...presets } = s.columns.presets;
      return { columns: { ...s.columns, presets } };
    }),
  setColumnGroups: (groups) => set((s) => ({ columns: { ...s.columns, groups } })),
});

export function restoreColumns(raw: unknown): ColumnsState {
  const r = fieldsOf(raw);
  const saved = fieldsOf(r.presets);
  const presets: ColumnsState["presets"] = {};
  const version = typeof r.layoutVersion === "number" ? r.layoutVersion : 0;
  for (const key of COLUMN_PRESET_KEYS) {
    if (!Array.isArray(saved[key])) continue;
    const columns = uniqueBy(
      listOf(saved[key], (c) => text(c, 80), MAX_COLUMNS),
      (c) => c,
    );
    const one = version < ONE_PERFORMANCE_VERSION ? withOnePerformance(columns) : columns;
    presets[key] = version < LAYOUT_VERSION ? withPerformanceRole(one) : one;
  }
  const groups = new Set(listOf(r.groups, (g) => oneOf(g, STAT_GROUP_IDS), 50));
  return { presets, groups: STAT_GROUP_IDS.filter((g) => groups.has(g)), layoutVersion: LAYOUT_VERSION };
}
