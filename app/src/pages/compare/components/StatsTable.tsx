import { useTranslation } from "react-i18next";
import type { Compared } from "../lib/compared";
import { StatsRow } from "./StatsRow";
import { StatsTableHead } from "./StatsTableHead";

interface StatsTableProps {
  entries: readonly Compared[];
  defs: number;
  poolMinutes: number;
}

export function StatsTable({ entries, defs, poolMinutes }: StatsTableProps) {
  const { t } = useTranslation("compare");
  return (
    <table aria-label={t("table.label")} className="w-full table-fixed border-collapse type-label">
      <colgroup>
        <col className="w-24" />
        <col />
        {entries.map((e) => (
          <col key={e.uid} className="w-32" />
        ))}
        <col className="w-20" />
      </colgroup>
      <StatsTableHead entries={entries} />
      <tbody>
        {Array.from({ length: defs }, (_, at) => (
          <StatsRow key={entries[0].lines[at].def.key} entries={entries} at={at} poolMinutes={poolMinutes} />
        ))}
      </tbody>
    </table>
  );
}
