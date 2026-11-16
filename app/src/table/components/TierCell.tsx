import { DeltaCell } from "@/components/DeltaCell";
import { missingText } from "@/components/missing";
import { ScoreCell } from "@/components/ScoreCell";
import { cn } from "@/lib/utils";
import type { NumberColumn, NumberTier } from "../columns/types";
import { CELL, type CellProps } from "../lib/cells";

export function TierCell({ column, colIndex, style, i, tier }: CellProps<NumberColumn> & { tier: NumberTier }) {
  const { scale, basis, missing } = tier;
  const reason = column.emptyReason?.(i);
  const emptyReason = reason && missingText(reason);
  const shared = { value: column.value[i], label: column.label, format: column.format, emptyReason };
  return (
    <td data-column-id={column.id} aria-colindex={colIndex} style={style} className={cn(CELL, "justify-end px-2")}>
      {scale === "score" ? (
        <ScoreCell {...shared} pct={basis?.[i]} missing={missing} />
      ) : (
        <DeltaCell {...shared} basis={basis?.[i]} />
      )}
    </td>
  );
}
