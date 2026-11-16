import { knownFilter, snapshotColumnIds } from "@/engine/columnIds";
import type { FilterSpec } from "@/engine/universe";
import { MAX_FILTERS } from "./filters";
import { fieldsOf, finiteIn, listOf, text, uniqueBy } from "./sanitize";

const MAX_MINUTES = 100_000;

export function pinnedFiltersOf(savedUniverse: unknown): FilterSpec[] {
  const saved = fieldsOf(savedUniverse);
  const filters: FilterSpec[] = [];
  const leagues = uniqueBy(
    listOf(saved.leagues, (l) => text(l, 120), 500),
    (l) => l,
  );
  if (leagues.length) filters.push({ col: "division", kind: "set", values: leagues });
  const max = finiteIn(saved.maxMinutes, 0, MAX_MINUTES);
  if (max !== null) {
    const min = finiteIn(saved.minMinutes, 0, MAX_MINUTES) ?? 0;
    filters.push({ col: "minutes", kind: "range", ...(min > 0 && { min }), max });
  }
  const pinned = listOf(saved.pinned, (f) => knownFilter(f, snapshotColumnIds()), MAX_FILTERS);
  return uniqueBy([...filters, ...pinned], (f) => f.col).slice(0, MAX_FILTERS);
}
