import { useTranslation } from "react-i18next";
import { StatName } from "@/components/StatName";
import { statText } from "@/player/lib/statText";
import { againstGroup } from "@/table/columns/labels";
import type { Compared } from "../lib/compared";
import { rowLeaders } from "../lib/leaders";
import { CompareBars } from "./CompareBars";
import { ValueCell } from "./ValueCell";

interface StatsRowProps {
  entries: readonly Compared[];
  at: number;
  poolMinutes: number;
}

export function StatsRow({ entries, at, poolMinutes }: StatsRowProps) {
  const { t } = useTranslation("compare");
  const reference = entries[0].lines[at];
  const { def } = reference;
  const leaders = rowLeaders(
    entries.map((e) => e.lines[at].value),
    def,
  );
  return (
    <tr data-stat={def.key} className="border-b border-line-subtle hover:bg-surface-hover">
      <th scope="row" className="truncate px-2 py-1 text-left font-[500] text-fg-secondary">
        <StatName def={def}>{def.abbr}</StatName>
        {def.lowerIsBetter && <span className="sr-only"> {t("table.lowerIsBetter")}</span>}
      </th>
      <td aria-hidden className="px-2">
        <CompareBars entries={entries} at={at} />
      </td>
      {entries.map((e, k) => (
        <ValueCell
          key={e.uid}
          uid={e.uid}
          line={e.lines[at]}
          leader={leaders[k]}
          against={againstGroup(e.group, poolMinutes)}
        />
      ))}
      <td className="px-2 text-right tabular-nums text-fg-muted">{statText(reference, reference.median)}</td>
    </tr>
  );
}
