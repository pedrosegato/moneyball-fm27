import type { StateCreator } from "zustand";
import { analysisColumnIds, knownFilter } from "@/engine/columnIds";
import type { FilterSpec } from "@/engine/universe";
import type { AppState } from "./index";
import { fieldsOf, listOf, uniqueBy } from "./sanitize";

export const MAX_FILTERS = 64;

export const FILTER_TABLE = {
  scout: "scout",
  squad: "elenco",
  signings: "contratacoes",
  shortlist: "shortlist",
  cart: "carrinho",
} as const;
export type FilterTable = (typeof FILTER_TABLE)[keyof typeof FILTER_TABLE];
export const FILTER_TABLES: readonly FilterTable[] = Object.values(FILTER_TABLE);

export const perFilterTable = <T>(valueFor: (table: FilterTable) => T): Record<FilterTable, T> =>
  Object.fromEntries(FILTER_TABLES.map((table) => [table, valueFor(table)])) as Record<FilterTable, T>;

export interface FiltersSlice {
  filters: Record<FilterTable, FilterSpec[]>;
  setFilter(table: FilterTable, filter: FilterSpec): void;
  removeFilter(table: FilterTable, col: string): void;
  clearFilters(table: FilterTable): void;
}

export const emptyFilters = (): Record<FilterTable, FilterSpec[]> => perFilterTable(() => []);

export function upsertFilter(filters: readonly FilterSpec[], filter: FilterSpec): FilterSpec[] {
  const at = filters.findIndex((f) => f.col === filter.col);
  return at < 0 ? [...filters, filter] : filters.map((f, k) => (k === at ? filter : f));
}

export const createFiltersSlice: StateCreator<AppState, [], [], FiltersSlice> = (set) => ({
  filters: emptyFilters(),
  setFilter: (table, filter) =>
    set((s) => ({ filters: { ...s.filters, [table]: upsertFilter(s.filters[table], filter) } })),
  removeFilter: (table, col) =>
    set((s) => ({ filters: { ...s.filters, [table]: s.filters[table].filter((f) => f.col !== col) } })),
  clearFilters: (table) => set((s) => ({ filters: { ...s.filters, [table]: [] } })),
});

export function mapFilters(
  filters: Record<FilterTable, FilterSpec[]>,
  change: (list: FilterSpec[]) => FilterSpec[],
): Record<FilterTable, FilterSpec[]> {
  return perFilterTable((table) => change(filters[table]));
}

function restoreFilterList(raw: unknown, columns: ReadonlySet<string>): FilterSpec[] {
  return uniqueBy(
    listOf(raw, (f) => knownFilter(f, columns), MAX_FILTERS),
    (f) => f.col,
  );
}

export function restoreFilters(raw: unknown, columns: ReadonlySet<string>): Record<FilterTable, FilterSpec[]> {
  if (Array.isArray(raw)) return { ...emptyFilters(), [FILTER_TABLE.scout]: restoreFilterList(raw, columns) };
  const saved = fieldsOf(raw);
  return perFilterTable((table) => restoreFilterList(saved[table], columns));
}

const constrains = (f: FilterSpec): boolean =>
  f.kind === "set"
    ? f.values.length > 0
    : f.kind === "range"
      ? f.min != null || f.max != null
      : f.from != null || f.to != null;

export function usableFilters(filters: readonly FilterSpec[], compositeIds: readonly string[]): FilterSpec[] {
  const columns = analysisColumnIds(compositeIds);
  return filters.filter((f) => constrains(f) && knownFilter(f, columns) !== null);
}
