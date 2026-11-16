import { useDeferredValue, useMemo } from "react";
import type { PlayerRecord } from "@/data/types";
import { useAppStore } from "@/store/index";
import type { SearchKey } from "@/store/ui";
import { searchRows, searchTerms } from "../lib/search";

export function usePlayerSearch(rows: Uint32Array, players: readonly PlayerRecord[], searchKey: SearchKey) {
  const query = useDeferredValue(useAppStore((s) => s.ui.searches[searchKey] ?? "")).trim();
  const terms = useMemo(() => searchTerms(query), [query]);
  const searched = useMemo(() => searchRows(rows, terms, players), [rows, terms, players]);
  return { query, terms, searched };
}
