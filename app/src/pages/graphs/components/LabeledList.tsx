import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { LabeledRow } from "../lib/labeledRows";
import { LabelCountControl } from "./LabelCountControl";
import { LabeledListRow } from "./LabeledListRow";

interface LabeledListProps {
  rows: readonly LabeledRow[];
  xAbbr: string;
  yAbbr: string;
  count: number;
  onCountChange(count: number): void;
  selectedUid: number | null;
  noLevels?: string;
  onFocusPoint(k: number): void;
  onOpen(uid: number): void;
}

export function LabeledList({
  rows,
  xAbbr,
  yAbbr,
  count,
  onCountChange,
  selectedUid,
  noLevels,
  onFocusPoint,
  onOpen,
}: LabeledListProps) {
  const { t } = useTranslation("graphs");
  const titleId = useId();
  const [current, setCurrent] = useState(0);
  const tabStop = Math.min(current, rows.length - 1);
  return (
    <aside aria-labelledby={titleId} className="flex w-80 shrink-0 flex-col border-l border-line-subtle">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2.5 pb-1.5">
        <h2 id={titleId} className="type-label text-fg">
          {t("labeled.title")}
        </h2>
        <LabelCountControl count={count} onChange={onCountChange} />
      </div>
      <p className="shrink-0 px-3 pb-2 type-caption text-fg-muted">{t("labeled.note")}</p>
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <table aria-label={t("labeled.title")} className="w-full table-fixed border-collapse type-label">
          <colgroup>
            <col className="w-[4.25rem]" />
            <col />
            <col className="w-[4.25rem]" />
            <col className="w-[4.25rem]" />
          </colgroup>
          <thead className="sticky top-0 bg-surface-canvas text-fg-muted">
            <tr className="h-7 border-b border-line-subtle">
              <th scope="col" className="pl-3 text-left font-[500]" title={t("labeled.levelTitle")}>
                {t("labeled.level")}
              </th>
              <th scope="col" className="text-left font-[500]">
                {t("labeled.name")}
              </th>
              <th scope="col" className="truncate pr-2 text-right font-[500]" title={xAbbr}>
                {xAbbr}
              </th>
              <th scope="col" className="truncate pr-3 text-right font-[500]" title={yAbbr}>
                {yAbbr}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, j) => (
              <LabeledListRow
                key={row.uid}
                row={row}
                selected={row.uid === selectedUid}
                tabStop={j === tabStop}
                noLevels={noLevels}
                onFocusRow={() => setCurrent(j)}
                onFocusPoint={onFocusPoint}
                onOpen={onOpen}
              />
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}
