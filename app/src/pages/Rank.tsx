import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { Page } from "@/components/Page";
import { COLUMN } from "@/engine/columnIds";
import type { PosGroup } from "@/engine/positions";
import { useFilterableTable } from "@/filters/hooks/useFilterableTable";
import { FILTER_TABLE } from "@/store/filters";
import { useAppStore } from "@/store/index";
import { SEARCH_KEY } from "@/store/ui";
import { useData } from "@/store/useData";
import type { ChipColumn, TableColumn, TableColumnState } from "@/table/columns/types";
import type { EmptyAction } from "@/table/components/TableEmpty";
import { usePlayerColumns } from "@/table/hooks/usePlayerColumns";
import { useTablePageState } from "@/table/hooks/useTablePageState";
import { presentActions } from "@/table/lib/emptyActions";
import { PlayerTable } from "@/table/PlayerTable";
import { PLAYER_ACTIONS } from "@/table/playerActions";
import { presetGroupOf } from "@/table/positionPreset";
import { RankToolbar } from "./rank/components/RankToolbar";
import { useRankScore } from "./rank/hooks/useRankScore";
import { useRankTable } from "./rank/hooks/useRankTable";
import { RANK_FIXED, RANK_FIXED_WEIGHTED, RANK_LEAD, RANK_SORT } from "./rank/lib/rankColumnIds";
import { rankEmptyText } from "./rank/lib/rankEmptyText";
import { ratingOption } from "./rank/lib/rankScore";

const isRankStat = (c: TableColumn): c is ChipColumn => c.kind === "chip" && c.id !== COLUMN.rating;

export function Rank() {
  const { t } = useTranslation("rank");
  const { snapshot, analysis, visible } = useData();
  const page = useTablePageState();
  const { filters, weights, poolMinutes, gameDate } = useAppStore(
    useShallow((s) => ({
      filters: s.filters.scout,
      weights: s.settings.engine.leagueWeights,
      poolMinutes: s.settings.engine.poolMinutes,
      gameDate: s.data.gameDate,
    })),
  );
  const [scoreId, setScoreId] = useState<string>(COLUMN.rating);
  const [weighted, setWeighted] = useState(false);
  const [group, setGroup] = useState<PosGroup | null>(null);

  const players = snapshot?.players;
  const { composites, columns: base } = usePlayerColumns(players, analysis);
  const stats = useMemo(() => (base ?? []).filter(isRankStat), [base]);
  const rating = useMemo(ratingOption, []);
  const options = useMemo(() => [rating, ...stats], [rating, stats]);
  const { stat, score, scoreValues } = useRankScore(stats, scoreId, poolMinutes, analysis?.rating);
  const { rows, columns } = useRankTable({
    players,
    base,
    visible: visible.scout,
    poolMinutes,
    group,
    scoreValues,
    score,
    weights,
    weighted,
  });
  const filterable = useFilterableTable({
    table: FILTER_TABLE.scout,
    columns,
    players,
    analysis,
    mode: page.mode,
    gameDate: gameDate ?? snapshot?.date ?? null,
  });

  const presetGroup = useMemo(() => group ?? presetGroupOf(filters), [group, filters]);
  const columnState = useMemo<TableColumnState>(
    () => ({
      group: presetGroup,
      ...page.columns,
      lead: RANK_LEAD,
      fixed: weighted ? RANK_FIXED_WEIGHTED : RANK_FIXED,
    }),
    [presetGroup, page.columns, weighted],
  );

  if (!snapshot || !analysis || !players || !columns) return null;
  const allGroups: EmptyAction | null = group ? { label: t("allPositions"), onClick: () => setGroup(null) } : null;

  return (
    <Page>
      <RankToolbar
        options={options}
        stat={stat}
        ratingOption={rating}
        onScoreChange={setScoreId}
        group={group}
        onGroupChange={setGroup}
        weighted={weighted}
        onWeightedChange={setWeighted}
        players={players}
        poolMinutes={poolMinutes}
      />
      <PlayerTable
        rows={rows}
        players={players}
        analysis={analysis}
        composites={composites}
        columns={columns}
        mode={page.mode}
        onModeChange={page.setMode}
        columnState={columnState}
        columnActions={page.columnActions}
        onOpenPlayer={page.selectPlayer}
        selectedUid={page.selectedUid}
        filtering={filterable.filtering}
        defaultSort={RANK_SORT}
        selectionActions={PLAYER_ACTIONS}
        searchKey={SEARCH_KEY.rank}
        filtersPanel={filterable.filtersPanel}
        filterBar={filterable.filterBar}
        emptyDescription={rankEmptyText(stat, group)}
        emptyActions={presentActions([allGroups, filterable.clearAction])}
      />
      {filterable.editorPopover}
    </Page>
  );
}
