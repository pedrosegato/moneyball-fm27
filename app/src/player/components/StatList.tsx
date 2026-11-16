import { useTranslation } from "react-i18next";
import { StatCell } from "@/components/StatCell";
import { StatName } from "@/components/StatName";
import { groupByStatGroup } from "@/engine/stats/groups";
import { cn } from "@/lib/utils";
import { VALUE_MODE } from "@/store/ui";
import type { StatLine } from "../lib/profile";
import { statText } from "../lib/statText";

const HEAD = "px-1 pb-1 text-right type-caption font-medium text-fg-muted";
const CELL = "px-1 text-right tabular-nums";

interface StatListProps {
  lines: readonly StatLine[];
  keeper: boolean;
  against: string;
}

export function StatList({ lines, keeper, against }: StatListProps) {
  const { t } = useTranslation("player");
  const groups = groupByStatGroup(
    lines.filter((l) => !(keeper ? l.def.outfieldOnly : l.def.gkOnly)),
    (l) => l.def.group,
  );
  return (
    <table className="w-full table-fixed border-separate border-spacing-0">
      <colgroup>
        <col />
        <col className="w-14" />
        <col className="w-14" />
        <col className="w-15" />
        <col className="w-14" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col" className={cn(HEAD, "text-left")}>
            {t("statTable.stat", { ns: "common" })}
          </th>
          <th scope="col" className={HEAD}>
            {t("valueMode.value", { ns: "common" })}
          </th>
          <th scope="col" className={HEAD}>
            {t("statList.pct")}
          </th>
          <th scope="col" className={HEAD}>
            {t("statTable.median", { ns: "common" })}
          </th>
          <th scope="col" className={HEAD}>
            {t("statList.top")}
          </th>
        </tr>
      </thead>
      {groups.map((g) => (
        <tbody key={g.id}>
          <tr>
            <th
              scope="rowgroup"
              colSpan={5}
              className="px-1 pt-3 pb-1 text-left type-caption font-medium text-fg-muted"
            >
              {g.label}
            </th>
          </tr>
          {g.items.map((line) => (
            <tr key={line.def.key} className="h-[1.625rem] hover:bg-surface-hover">
              <th scope="row" className="truncate px-1 text-left font-normal text-fg-secondary">
                <StatName def={line.def}>{line.def.abbr}</StatName>
              </th>
              <td className={cn(CELL, "text-fg")}>{statText(line, line.value)}</td>
              <td className={CELL}>
                <StatCell
                  value={line.value}
                  pct={line.pct}
                  mode={VALUE_MODE.percentile}
                  def={line.def}
                  missing={line.missing}
                  against={against}
                />
              </td>
              <td className={cn(CELL, "text-fg-muted")}>{statText(line, line.median)}</td>
              <td className={cn(CELL, "text-fg-muted")}>{statText(line, line.top)}</td>
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}
