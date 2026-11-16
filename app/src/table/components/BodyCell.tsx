import { memo } from "react";
import type { ValueMode } from "@/store/ui";
import type { TableColumn } from "../columns/types";
import { ChipCell } from "./ChipCell";
import { CustomCell } from "./CustomCell";
import { NumberCell } from "./NumberCell";
import { TextCell } from "./TextCell";
import { TierCell } from "./TierCell";

interface BodyCellProps {
  column: TableColumn;
  colIndex: number;
  gap: number;
  i: number;
  mode: ValueMode;
  active: boolean;
}

export const BodyCell = memo(function BodyCell({ column, colIndex, gap, i, mode, active }: BodyCellProps) {
  const style = { width: column.width, marginInlineStart: gap || undefined };
  switch (column.kind) {
    case "custom":
      return <CustomCell column={column} colIndex={colIndex} style={style} i={i} active={active} />;
    case "chip":
      return <ChipCell column={column} colIndex={colIndex} style={style} i={i} mode={mode} />;
    case "number":
      return column.tier ? (
        <TierCell column={column} colIndex={colIndex} style={style} i={i} tier={column.tier} />
      ) : (
        <NumberCell column={column} colIndex={colIndex} style={style} i={i} />
      );
    default:
      return <TextCell column={column} colIndex={colIndex} style={style} i={i} />;
  }
});
