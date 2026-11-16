import type { CSSProperties } from "react";
import type { TableColumn } from "../columns/types";

export const CELL = "flex h-full flex-none items-center";

export interface CellProps<C extends TableColumn> {
  column: C;
  colIndex: number;
  style: CSSProperties;
  i: number;
}
