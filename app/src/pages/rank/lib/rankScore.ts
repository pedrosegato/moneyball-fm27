import { COLUMN } from "@/engine/columnIds";
import { i18n } from "@/i18n";
import { COLUMN_GROUP } from "@/table/columns/ids";
import { poolLabel } from "@/table/columns/labels";
import type { ChipColumn } from "@/table/columns/types";
import type { StatOption } from "@/table/StatPicker";

export interface RankScore {
  abbr: string;
  label: string;
  description: string;
  percentile: boolean;
}

export const ratingOption = (): StatOption => ({
  id: COLUMN.rating,
  abbr: i18n.t("rank:rating.abbr"),
  label: i18n.t("rank:rating.label"),
  group: COLUMN_GROUP.identity,
});

export function rankScoreOf(stat: ChipColumn | null, poolMinutes: number): RankScore {
  if (!stat) {
    return {
      abbr: i18n.t("rank:rating.abbr"),
      label: i18n.t("rank:rating.label"),
      percentile: false,
      description: i18n.t("rank:rating.description"),
    };
  }
  return {
    abbr: i18n.t("rank:score.abbr", { abbr: stat.abbr }),
    label: i18n.t("rank:score.label", { label: stat.label }),
    percentile: true,
    description: i18n.t("rank:score.description", {
      abbr: stat.abbr,
      pool: poolLabel(poolMinutes),
      description: stat.description,
    }),
  };
}
