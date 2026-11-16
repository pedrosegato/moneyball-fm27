import type { SortingState } from "@tanstack/react-table";
import type { TableColumn } from "../columns/types";
import { headerColumn, type TableHeader } from "./tableModel";

export type Sorted = "asc" | "desc" | false;

export function captionRuns(headers: readonly TableHeader[]) {
  const groupAt = (k: number) => headerColumn(headers[k]).group;
  const x: number[] = [];
  const runStart: number[] = [];
  const runWidth: number[] = [];
  let at = 0;
  for (let k = 0; k < headers.length; k++) {
    x.push(at);
    at += headers[k].getSize();
    runStart.push(k > 0 && groupAt(k - 1) === groupAt(k) ? runStart[k - 1] : k);
  }
  for (let k = 0; k < headers.length; k++) {
    const first = runStart[k];
    let width = 0;
    for (let j = first; j < headers.length && runStart[j] === first; j++) width += headers[j].getSize();
    runWidth.push(width);
  }
  return { x, runStart, runWidth };
}

export const sortedAs = (sort: SortingState[number] | undefined, id: string): Sorted =>
  sort?.id === id ? (sort.desc ? "desc" : "asc") : false;

export const ariaSort = (sorted: Sorted) => (sorted ? (sorted === "desc" ? "descending" : "ascending") : undefined);

export const alignsEnd = (column: TableColumn) =>
  column.kind === "custom" ? column.align === "end" : column.kind !== "text";

const MENU_ROOM = {
  left: "group-hover/header:pl-5 group-has-[[data-header-slot=menu]:focus-visible]/header:pl-5 group-has-[[data-popup-open]]/header:pl-5",
  right:
    "group-hover/header:pr-5 group-has-[[data-header-slot=menu]:focus-visible]/header:pr-5 group-has-[[data-popup-open]]/header:pr-5",
};

export function menuRoom(end: boolean, filtered: boolean): string {
  if (end) return filtered ? "pl-5" : MENU_ROOM.left;
  return filtered ? "pr-5" : MENU_ROOM.right;
}
