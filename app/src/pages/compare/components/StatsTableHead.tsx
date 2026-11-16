import { useTranslation } from "react-i18next";
import { playerName } from "@/lib/playerName";
import { cn } from "@/lib/utils";
import { MedianMarks } from "@/player/components/MedianMarks";
import type { Compared } from "../lib/compared";
import { SLOT_BAR } from "../lib/slotStyles";
import { HEAD } from "../lib/tableStyles";

export function StatsTableHead({ entries }: { entries: readonly Compared[] }) {
  const { t } = useTranslation("compare");
  return (
    <thead>
      <tr className="border-b border-line-subtle">
        <th scope="col" className={cn(HEAD, "text-left")}>
          {t("statTable.stat", { ns: "common" })}
        </th>
        <th aria-hidden className={cn(HEAD, "relative font-medium")}>
          <MedianMarks className="bottom-1.5" />
        </th>
        {entries.map(({ uid, slot, player }) => (
          <th key={uid} scope="col" className={cn(HEAD, "text-right")}>
            <span className="flex items-center justify-end gap-1.5">
              <span aria-hidden className={cn("h-0.5 w-3 shrink-0 rounded-full", SLOT_BAR[slot])} />
              <span className="truncate text-fg-secondary" title={player.name ?? undefined}>
                {playerName(player)}
              </span>
            </span>
          </th>
        ))}
        <th scope="col" className={cn(HEAD, "text-right")}>
          {t("statTable.median", { ns: "common" })}
        </th>
      </tr>
    </thead>
  );
}
