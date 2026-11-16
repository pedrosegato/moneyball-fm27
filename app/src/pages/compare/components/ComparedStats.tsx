import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { PosGroup } from "@/engine/positions";
import { againstNote } from "../lib/againstNote";
import type { Compared } from "../lib/compared";
import { GroupPicker } from "./GroupPicker";
import { LeaderLegend } from "./LeaderLegend";
import { StatsTable } from "./StatsTable";

interface ComparedStatsProps {
  entries: readonly Compared[];
  group: PosGroup;
  defs: number;
  poolMinutes: number;
  onGroupChange(group: PosGroup): void;
}

export function ComparedStats({ entries, group, defs, poolMinutes, onGroupChange }: ComparedStatsProps) {
  const { t } = useTranslation("compare");
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id={titleId} className="type-heading text-fg">
          {t("stats.title")}
        </h2>
        <GroupPicker group={group} onChange={onGroupChange} />
        <p className="type-caption text-fg-muted">{againstNote(entries, poolMinutes)}</p>
        <p className="type-caption text-fg-muted">{t("stats.howToRead")}</p>
        {entries.length > 1 && <LeaderLegend />}
      </div>
      <StatsTable entries={entries} defs={defs} poolMinutes={poolMinutes} />
    </section>
  );
}
