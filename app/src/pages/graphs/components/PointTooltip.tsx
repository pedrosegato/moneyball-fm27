import { useTranslation } from "react-i18next";
import { ScoreCell } from "@/components/ScoreCell";
import type { PlayerRecord } from "@/data/types";
import { marketValue, minutesOf } from "@/engine/club";
import type { PosGroup } from "@/engine/positions";
import { formatCount, orEmpty } from "@/lib/format";
import { formatMoney, type Money } from "@/lib/money";
import { playerName } from "@/lib/playerName";
import { playerSubtitle } from "@/player/lib/playerSubtitle";
import type { Axis } from "../lib/scatter";
import { AxisLine } from "./AxisLine";

interface PointTooltipProps {
  player: PlayerRecord;
  i: number;
  group: PosGroup;
  axes: { x: Axis; y: Axis };
  level: number;
  noLevels: string | undefined;
  money: Money;
}

export function PointTooltip({ player, i, group, axes, level, noLevels, money }: PointTooltipProps) {
  const { t } = useTranslation("graphs");
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col">
        <span className="font-[560] [overflow-wrap:anywhere] text-fg">{playerName(player)}</span>
        <span className="type-caption text-fg-muted">{playerSubtitle(player, group, { division: false })}</span>
      </div>
      <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 type-label tabular-nums">
        <AxisLine axis={axes.x} i={i} />
        <AxisLine axis={axes.y} i={i} />
        <dt className="self-center text-fg-muted">{t("tooltip.both")}</dt>
        <dd className="text-right">
          <ScoreCell value={level} label={t("levels.label")} format={formatCount} emptyReason={noLevels} />
        </dd>
        <dt className="text-fg-muted">{t("minutes", { ns: "common" })}</dt>
        <dd className="text-right text-fg-secondary">{formatCount(minutesOf(player))}</dd>
        <dt className="text-fg-muted">{t("marketValue", { ns: "common" })}</dt>
        <dd className="text-right text-fg-secondary">{orEmpty(marketValue(player), (v) => formatMoney(v, money))}</dd>
      </dl>
    </div>
  );
}
