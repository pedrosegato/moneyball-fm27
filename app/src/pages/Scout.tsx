import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { Page } from "@/components/Page";
import { ToggleChip } from "@/components/ToggleChip";
import { useFilterableTable } from "@/filters/hooks/useFilterableTable";
import { PositionFilter } from "@/filters/PositionFilter";
import { ownsPositionFilter } from "@/filters/positionChoice";
import { FILTER_TABLE } from "@/store/filters";
import { useAppStore } from "@/store/index";
import { SEARCH_KEY } from "@/store/ui";
import { useData } from "@/store/useData";
import type { TableColumnState } from "@/table/columns/types";
import type { EmptyAction } from "@/table/components/TableEmpty";
import { usePlayerColumns } from "@/table/hooks/usePlayerColumns";
import { useTablePageState } from "@/table/hooks/useTablePageState";
import { presentActions } from "@/table/lib/emptyActions";
import { PlayerTable } from "@/table/PlayerTable";
import { PLAYER_ACTIONS } from "@/table/playerActions";
import { POSITION_COLUMN, presetGroupOf } from "@/table/positionPreset";
import { MoneyballCriteria } from "./scout/components/MoneyballCriteria";
import { useScoutRows } from "./scout/hooks/useScoutRows";
import { MONEYBALL_COLUMNS, MONEYBALL_SORT } from "./scout/lib/moneyball";

export function Scout() {
  const { t } = useTranslation("scout");
  const { snapshot, analysis, visible } = useData();
  const page = useTablePageState();
  const { undervaluedOnly, setMoneyball, filters, gameDate } = useAppStore(
    useShallow((s) => ({
      undervaluedOnly: s.ui.moneyball,
      setMoneyball: s.setMoneyball,
      filters: s.filters.scout,
      gameDate: s.data.gameDate,
    })),
  );
  const players = snapshot?.players;
  const { composites, columns } = usePlayerColumns(players, analysis);
  const filterable = useFilterableTable({
    table: FILTER_TABLE.scout,
    columns,
    players,
    analysis,
    mode: page.mode,
    gameDate: gameDate ?? snapshot?.date ?? null,
    shownElsewhere: ownsPositionFilter(filters) ? POSITION_COLUMN : undefined,
  });
  const { rows, total } = useScoutRows(analysis, players?.length ?? 0, visible.scout, undervaluedOnly);

  const group = useMemo(() => presetGroupOf(filters), [filters]);
  const fixed = undervaluedOnly ? MONEYBALL_COLUMNS : undefined;
  const columnState = useMemo<TableColumnState>(
    () => ({ group, ...page.columns, fixed }),
    [group, page.columns, fixed],
  );

  if (!snapshot || !analysis || !columns || !players) return null;
  const showAll: EmptyAction = { label: t("showAll"), onClick: () => setMoneyball(false) };
  const ways = presentActions([undervaluedOnly && showAll, filterable.clearAction]);

  return (
    <Page>
      <PlayerTable
        key={undervaluedOnly ? "moneyball" : "all"}
        rows={rows}
        total={total}
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
        defaultSort={undervaluedOnly ? MONEYBALL_SORT : undefined}
        selectionActions={PLAYER_ACTIONS}
        searchKey={SEARCH_KEY.scout}
        position={<PositionFilter table={FILTER_TABLE.scout} />}
        filtersPanel={filterable.filtersPanel}
        chips={
          <ToggleChip label={t("onlyUndervalued", { ns: "common" })} on={undervaluedOnly} onChange={setMoneyball} />
        }
        filterBar={filterable.filterBar}
        criteria={undervaluedOnly && <MoneyballCriteria />}
        emptyActions={ways}
        emptyDescription={undervaluedOnly ? t("emptyMoneyball") : undefined}
      />
      {filterable.editorPopover}
    </Page>
  );
}
