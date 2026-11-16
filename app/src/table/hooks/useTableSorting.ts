import type { SortingState } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import type { ValueMode } from "@/store/ui";
import type { TableColumn, TableColumnState } from "../columns/types";
import { OWN_PERFORMANCE } from "../presets";

export const NO_SORT: SortingState = [];

interface TableSortingOptions {
  byId: ReadonlyMap<string, TableColumn>;
  visibleIds: readonly string[];
  columnVisibility: Readonly<Record<string, boolean>>;
  columnState: Pick<TableColumnState, "groups">;
  defaultSort: { id: string; desc: boolean } | undefined;
  mode: ValueMode;
}

export function useTableSorting({
  byId,
  visibleIds,
  columnVisibility,
  columnState: { groups },
  defaultSort,
  mode,
}: TableSortingOptions) {
  const [chosenSort, setChosenSort] = useState<SortingState>(NO_SORT);
  const defaultId = defaultSort?.id;
  const defaultDesc = defaultSort?.desc;
  const groupLead = byId.get(visibleIds.find((id) => groups.some((g) => g === byId.get(id)?.group)) ?? "");
  const sorting = useMemo(() => {
    const kept = chosenSort.filter((s) => columnVisibility[s.id]);
    if (kept.length) return kept;
    if (defaultId !== undefined && columnVisibility[defaultId]) return [{ id: defaultId, desc: !!defaultDesc }];
    if (columnVisibility[OWN_PERFORMANCE]) return [{ id: OWN_PERFORMANCE, desc: true }];
    return groupLead ? [{ id: groupLead.id, desc: groupLead.descFirst(mode) }] : NO_SORT;
  }, [chosenSort, columnVisibility, defaultId, defaultDesc, groupLead, mode]);
  return { sorting, chosenSort, setChosenSort };
}
