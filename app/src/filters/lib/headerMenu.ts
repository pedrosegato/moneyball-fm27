import { createContext, type MouseEvent } from "react";
import type { TableColumn } from "@/table/columns/types";

export interface ColumnFilterState {
  filterable: boolean;
  active: boolean;
}

export interface ColumnFiltering {
  stateOf(column: TableColumn): ColumnFilterState;
  edit(column: TableColumn, anchor: HTMLElement, viaKeyboard: boolean): void;
  clear(column: TableColumn): void;
}

export interface HeaderMenuActions {
  column(id: string): TableColumn | undefined;
  header(id: string): HTMLElement | null;
  sortedAs(id: string): "asc" | "desc" | null;
  sortBy(id: string, desc: boolean): void;
  sortedByUser(id: string): boolean;
  unsort(): void;
  hideBlock(id: string): string | null | undefined;
  hide(id: string): void;
  filtering?: ColumnFiltering;
}

export const MENU_TRIGGER = "button[aria-haspopup]";

export const NO_FILTER: ColumnFilterState = { filterable: false, active: false };

export const byKeyboard = (e: MouseEvent) => e.detail === 0;

export const HEADER_MENU_POPUP =
  "z-50 max-h-(--available-height) w-60 overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-line outline-none motion-pop";

export const ContextColumn = createContext<(id: string | undefined) => boolean>(() => false);
