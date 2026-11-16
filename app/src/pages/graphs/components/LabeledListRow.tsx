import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { ScoreCell } from "@/components/ScoreCell";
import { formatCount } from "@/lib/format";
import type { LabeledRow } from "../lib/labeledRows";

interface LabeledListRowProps {
  row: LabeledRow;
  selected: boolean;
  tabStop: boolean;
  noLevels?: string;
  onFocusRow(): void;
  onFocusPoint(k: number): void;
  onOpen(uid: number): void;
}

function moveFocus(e: KeyboardEvent<HTMLTableRowElement>, step: number) {
  const next = step > 0 ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling;
  if (next instanceof HTMLElement) {
    e.preventDefault();
    next.focus();
  }
}

export function LabeledListRow({
  row,
  selected,
  tabStop,
  noLevels,
  onFocusRow,
  onFocusPoint,
  onOpen,
}: LabeledListRowProps) {
  const { t } = useTranslation("graphs");
  return (
    <tr
      data-player={row.uid}
      data-selected={selected || undefined}
      tabIndex={tabStop ? 0 : -1}
      onClick={() => onOpen(row.uid)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(row.uid);
        } else if (e.key === "ArrowDown") moveFocus(e, 1);
        else if (e.key === "ArrowUp") moveFocus(e, -1);
      }}
      onFocus={(e) => {
        onFocusRow();
        if (e.currentTarget.matches(":focus-visible")) onFocusPoint(row.k);
      }}
      onBlur={() => onFocusPoint(-1)}
      onPointerEnter={() => onFocusPoint(row.k)}
      onPointerLeave={() => onFocusPoint(-1)}
      className="h-8 cursor-default border-b border-line-subtle outline-none hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring data-selected:bg-surface-active"
    >
      <td className="pl-3">
        <ScoreCell value={row.level} label={t("levels.label")} format={formatCount} emptyReason={noLevels} />
      </td>
      <th scope="row" className="truncate text-left font-[550] text-fg" title={row.name}>
        {row.name}
      </th>
      <td className="pr-2 text-right tabular-nums text-fg-secondary">{row.x}</td>
      <td className="pr-3 text-right tabular-nums text-fg-secondary">{row.y}</td>
    </tr>
  );
}
