import type { PosGroup } from "@/engine/positions";
import { i18n } from "@/i18n";
import { groupNoun } from "@/table/columns/labels";
import type { ChipColumn } from "@/table/columns/types";

export function rankEmptyText(stat: ChipColumn | null, group: PosGroup | null): string {
  const what = stat ? stat.abbr : i18n.t("rank:empty.rating");
  return group
    ? i18n.t("rank:empty.statInGroup", { what, group: groupNoun(group) })
    : i18n.t("rank:empty.stat", { what });
}
