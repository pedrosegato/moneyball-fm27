import type { ReactNode } from "react";
import type { MissingReason } from "@/components/missing";
import type { PlayerRecord } from "@/data/types";
import type { Composite } from "@/engine/composites";
import type { AnalysisResult } from "@/engine/index";
import type { PosGroup } from "@/engine/positions";
import type { StatDef } from "@/engine/stats/catalog";
import type { StatGroup } from "@/engine/stats/groups";
import type { Money } from "@/lib/money";
import type { ColumnsState } from "@/store/columns";
import type { ValueMode } from "@/store/ui";
import type { COLUMN_GROUP } from "./ids";

export interface TableSource {
  players: readonly PlayerRecord[];
  analysis: AnalysisResult;
  composites: readonly Composite[];
  money?: Money;
}

export type ColumnGroup = StatGroup | typeof COLUMN_GROUP.identity;

export type ExportValue = string | number | null;

export interface ExportField {
  header: string;
  get(i: number, mode: ValueMode): ExportValue;
}

interface ColumnBase {
  id: string;
  abbr: string;
  label: string;
  description: string;
  group: ColumnGroup;
  width: number;
  descFirst(mode: ValueMode): boolean;
  sortKey(mode: ValueMode): ArrayLike<number>;
  exports: readonly ExportField[];
  local?: boolean;
}

export interface ChipColumn extends ColumnBase {
  kind: "chip";
  def: Pick<StatDef, "label" | "unit" | "lowerIsBetter">;
  value: ArrayLike<number>;
  pct: ArrayLike<number>;
  missing(i: number): MissingReason | undefined;
  scale?: "rating";
  against?(i: number): string;
}

export interface NumberTier {
  scale: "score" | "delta";
  basis?: ArrayLike<number>;
  missing?: MissingReason;
}

export interface NumberColumn extends ColumnBase {
  kind: "number";
  value: ArrayLike<number>;
  format(v: number): string;
  emptyReason?(i: number): MissingReason | undefined;
  moneyScale?: number;
  tier?: NumberTier;
}

export interface TextColumn extends ColumnBase {
  kind: "text";
  text(i: number): string | null;
  caption?(i: number): string;
}

export interface CustomColumn extends ColumnBase {
  kind: "custom";
  align: "start" | "end";
  render(i: number, active: boolean): ReactNode;
}

export type TableColumn = ChipColumn | NumberColumn | TextColumn | CustomColumn;

export interface TableColumnState extends ColumnsState {
  group: PosGroup | null;
  fixed?: readonly string[];
  lead?: readonly string[];
}
