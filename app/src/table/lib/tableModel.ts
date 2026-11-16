import {
  columnOrderingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  type Header,
  metaHelper,
  type ReactTable,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { NAME_COLUMN } from "../columns/ids";
import type { TableColumn } from "../columns/types";

export const ROW_HEIGHT = 40;
export const HEADER_HEIGHT = 40;
export const OVERSCAN = 12;
export const COLUMN_OVERSCAN = 4;
export const COLUMN_BLOCK = 4;
export const SELECT_WIDTH = 36;
export const SELECT_COLUMN = "select";

export const pageRows = (viewport: number) => Math.max(1, Math.floor((viewport - HEADER_HEIGHT) / ROW_HEIGHT) - 1);

export const features = tableFeatures({
  columnVisibilityFeature,
  columnOrderingFeature,
  columnSizingFeature,
  rowSortingFeature,
  columnMeta: metaHelper<{ column: TableColumn }>(),
});
export interface RowRef {
  index: number;
}
export const helper = createColumnHelper<typeof features, RowRef>();

export type TableHeader = Header<typeof features, RowRef, unknown>;

export function headerColumn(header: TableHeader): TableColumn {
  const meta = header.column.columnDef.meta;
  if (!meta) throw new Error(`table column ${header.id} has no meta`);
  return meta.column;
}
export type PlayerReactTable = ReactTable<typeof features, RowRef>;

export type NameCellWrap = (uid: number, cell: ReactNode, active: boolean) => ReactNode;

export interface WindowColumn {
  column: TableColumn;
  index: number;
  gap: number;
}

export const HEADER_SLOT = { select: "select", sort: "sort", menu: "menu" } as const;
export type HeaderSlot = (typeof HEADER_SLOT)[keyof typeof HEADER_SLOT];

export interface HeaderStop {
  col: string;
  slot: HeaderSlot;
}

export const FIRST_STOP: HeaderStop = { col: NAME_COLUMN, slot: HEADER_SLOT.sort };

export interface RowEvents {
  onClick(e: MouseEvent): void;
  onMouseDown(e: MouseEvent<HTMLElement>): void;
  onKeyDown(e: KeyboardEvent): void;
}

export function cellText(column: TableColumn, i: number): string | null {
  if (column.kind === "text") return column.text(i);
  if (column.kind === "number") return Number.isNaN(column.value[i]) ? null : column.format(column.value[i]);
  return null;
}
