import { useTranslation } from "react-i18next";
import { PageToolbar } from "@/components/PageToolbar";
import type { PlayerRecord } from "@/data/types";
import type { PosGroup } from "@/engine/positions";
import { poolLabel } from "@/table/columns/labels";
import type { ChipColumn } from "@/table/columns/types";
import { type StatOption, StatPicker } from "@/table/StatPicker";
import { GroupMenu } from "./GroupMenu";
import { LeagueWeights } from "./LeagueWeights";
import { WeightToggle } from "./WeightToggle";

interface RankToolbarProps {
  options: readonly StatOption[];
  stat: ChipColumn | null;
  ratingOption: StatOption;
  onScoreChange(id: string): void;
  group: PosGroup | null;
  onGroupChange(group: PosGroup | null): void;
  weighted: boolean;
  onWeightedChange(weighted: boolean): void;
  players: readonly PlayerRecord[];
  poolMinutes: number;
}

export function RankToolbar({
  options,
  stat,
  ratingOption,
  onScoreChange,
  group,
  onGroupChange,
  weighted,
  onWeightedChange,
  players,
  poolMinutes,
}: RankToolbarProps) {
  const { t } = useTranslation("rank");
  const pool = poolLabel(poolMinutes);
  return (
    <PageToolbar>
      <StatPicker
        prefix={t("toolbar.sortBy")}
        name={t("toolbar.sortBy")}
        searchLabel={t("toolbar.search")}
        options={options}
        value={stat ?? ratingOption}
        onChange={onScoreChange}
      />
      <GroupMenu group={group} onChange={onGroupChange} />
      <WeightToggle weighted={weighted} onChange={onWeightedChange} />
      <LeagueWeights players={players} />
      <p className="ml-auto type-caption whitespace-nowrap text-fg-faint">
        {stat ? t("toolbar.whoPercentile", { pool }) : t("toolbar.who", { pool })}
      </p>
    </PageToolbar>
  );
}
