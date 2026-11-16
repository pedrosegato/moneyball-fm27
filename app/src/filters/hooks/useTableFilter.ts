import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { FilterSpec } from "@/engine/universe";
import type { FilterTable } from "@/store/filters";
import { useAppStore } from "@/store/index";

export function useTableFilter(
  table: FilterTable,
  col: string,
): [FilterSpec | undefined, (filter: FilterSpec | null) => void] {
  const { filters, setFilter, removeFilter } = useAppStore(
    useShallow((s) => ({ filters: s.filters[table], setFilter: s.setFilter, removeFilter: s.removeFilter })),
  );
  const filter = useMemo(() => filters.find((f) => f.col === col), [filters, col]);
  const set = (next: FilterSpec | null) => (next ? setFilter(table, next) : removeFilter(table, col));
  return [filter, set];
}
