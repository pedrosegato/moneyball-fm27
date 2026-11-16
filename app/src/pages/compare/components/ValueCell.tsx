import { useTranslation } from "react-i18next";
import { StatCell } from "@/components/StatCell";
import { EMPTY_VALUE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { StatLine } from "@/player/lib/profile";
import { VALUE_MODE } from "@/store/ui";
import { LEADER_OUTLINE } from "../lib/slotStyles";

interface ValueCellProps {
  uid: number;
  line: StatLine;
  leader: boolean;
  against: string;
}

export function ValueCell({ uid, line, leader, against }: ValueCellProps) {
  const { t } = useTranslation("compare");
  const pct = Number.isNaN(line.pct) ? null : Math.round(line.pct);
  return (
    <td data-player={uid} data-leader={leader || undefined} className="px-2 py-1.5 text-right">
      <span className="inline-flex items-center justify-end gap-1.5">
        <StatCell
          value={line.value}
          pct={line.pct}
          mode={VALUE_MODE.value}
          def={line.def}
          missing={line.missing}
          against={against}
          className={cn(leader && LEADER_OUTLINE)}
        />
        <span aria-hidden className="w-6 type-caption tabular-nums text-fg-muted">
          {pct ?? EMPTY_VALUE}
        </span>
        {leader && <span className="sr-only">{t("table.leader")}</span>}
      </span>
    </td>
  );
}
