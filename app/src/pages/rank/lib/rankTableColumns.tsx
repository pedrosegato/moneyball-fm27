import { EmptyCell } from "@/components/EmptyCell";
import { i18n } from "@/i18n";
import { formatCount, formatFixed, multiplierText } from "@/lib/format";
import { pageNumber } from "@/table/columns/factories";
import type { CustomColumn, TableColumn } from "@/table/columns/types";
import { customColumn } from "@/table/lib/customColumn";
import { RankMove } from "../components/RankMove";
import { RANK_COLUMN } from "./rankColumnIds";
import type { RankColumns } from "./rankRows";
import type { RankScore } from "./rankScore";

function moveColumn(move: Float64Array): CustomColumn {
  const text = {
    same: i18n.t("rank:columns.move.same"),
    up: i18n.t("rank:columns.move.up"),
    down: i18n.t("rank:columns.move.down"),
  };
  const abbr = i18n.t("rank:columns.move.abbr");
  return customColumn({
    id: RANK_COLUMN.move,
    abbr,
    label: i18n.t("rank:columns.move.label"),
    description: i18n.t("rank:columns.move.description"),
    width: 84,
    align: "end",
    descFirst: true,
    sortKey: () => move,
    exports: [{ header: abbr, get: (i) => (Number.isNaN(move[i]) ? null : move[i]) }],
    render: (i) => (Number.isNaN(move[i]) ? <EmptyCell /> : <RankMove move={move[i]} text={text} />),
  });
}

export function rankTableColumns(base: readonly TableColumn[], rank: RankColumns, score: RankScore): TableColumn[] {
  const format = (v: number) => formatFixed(v, score.percentile ? 0 : 2);
  return [
    ...base,
    pageNumber({
      id: RANK_COLUMN.position,
      abbr: i18n.t("rank:columns.position.abbr"),
      label: i18n.t("rank:columns.position.label"),
      description: i18n.t("rank:columns.position.description"),
      width: 52,
      value: rank.position,
      format: formatCount,
      descFirst: false,
    }),
    pageNumber({
      id: RANK_COLUMN.leagueWeight,
      abbr: i18n.t("rank:columns.weight.abbr"),
      label: i18n.t("rank:columns.weight.label"),
      description: i18n.t("rank:columns.weight.description"),
      width: 68,
      value: rank.weight,
      format: (v) => multiplierText(formatFixed(v, 3)),
    }),
    pageNumber({
      id: RANK_COLUMN.base,
      abbr: score.abbr,
      label: score.label,
      description: score.description,
      width: Math.max(76, Math.ceil(score.abbr.length * 6.4) + 30),
      value: rank.base,
      format,
      tier: score.percentile ? { scale: "score" } : undefined,
    }),
    pageNumber({
      id: RANK_COLUMN.weighted,
      abbr: i18n.t("rank:columns.weighted.abbr"),
      label: i18n.t("rank:columns.weighted.label", { abbr: score.abbr }),
      description: i18n.t("rank:columns.weighted.description", { abbr: score.abbr }),
      width: 84,
      value: rank.weighted,
      format,
    }),
    moveColumn(rank.move),
  ];
}
