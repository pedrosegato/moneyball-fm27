import { type ReactNode, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { PlayerRecord } from "@/data/types";
import type { Composite } from "@/engine/composites";
import type { AnalysisResult } from "@/engine/index";
import type { PosGroup } from "@/engine/positions";
import { useFilterableTable } from "@/filters/hooks/useFilterableTable";
import { PositionFilter } from "@/filters/PositionFilter";
import { ownsPositionFilter } from "@/filters/positionChoice";
import type { FilterTable } from "@/store/filters";
import { useAppStore } from "@/store/index";
import type { TableColumn, TableColumnState } from "./columns/types";
import { LeagueWeightingControl } from "./components/LeagueWeightingControl";
import type { EmptyAction } from "./components/TableEmpty";
import { useTablePageState } from "./hooks/useTablePageState";
import { presentActions } from "./lib/emptyActions";
import { currentMask, useStableRows, visibleRows } from "./lib/rows";
import type { SelectionAction } from "./lib/selectionActions";
import type { NameCellWrap } from "./lib/tableModel";
import { PlayerTableView } from "./PlayerTableView";
import { POSITION_COLUMN, presetGroupOf } from "./positionPreset";

export interface PlayerTableProps {
  table: FilterTable;
  rows: Uint32Array;
  total?: number;
  players: readonly PlayerRecord[];
  analysis: AnalysisResult;
  composites: readonly Composite[];
  columns: readonly TableColumn[];
  group?: PosGroup | null;
  fixed?: readonly string[];
  lead?: readonly string[];
  chips?: ReactNode;
  criteria?: ReactNode;
  emptyActions?: readonly (EmptyAction | false | null)[];
  emptyDescription?: string;
  defaultSort?: { id: string; desc: boolean };
  selectionActions?: readonly SelectionAction[];
  nameCell?: NameCellWrap;
}

const NO_ACTIONS: readonly EmptyAction[] = [];

export function PlayerTable({
  table,
  rows,
  total,
  players,
  analysis,
  columns,
  group,
  fixed,
  lead,
  emptyActions = NO_ACTIONS,
  ...view
}: PlayerTableProps) {
  const page = useTablePageState();
  const { filters, visible, gameDate } = useAppStore(
    useShallow((s) => ({
      filters: s.filters[table],
      visible: s.data.visible[table],
      gameDate: s.data.gameDate ?? s.data.snapshot?.date ?? null,
    })),
  );
  const filterable = useFilterableTable({
    table,
    columns,
    players,
    analysis,
    mode: page.mode,
    gameDate,
    shownElsewhere: ownsPositionFilter(filters) ? POSITION_COLUMN : undefined,
  });
  const presetGroup = group === undefined ? presetGroupOf(filters) : group;
  const columnState = useMemo<TableColumnState>(
    () => ({ group: presetGroup, ...page.columns, fixed, lead }),
    [presetGroup, page.columns, fixed, lead],
  );
  const mask = currentMask(visible, players.length);
  const shown = useStableRows(useMemo(() => visibleRows(rows, mask), [rows, mask]));

  return (
    <>
      <PlayerTableView
        {...view}
        rows={shown}
        total={total ?? rows.length}
        players={players}
        analysis={analysis}
        columns={columns}
        searchKey={table}
        mode={page.mode}
        onModeChange={page.setMode}
        columnState={columnState}
        columnActions={page.columnActions}
        onOpenPlayer={page.selectPlayer}
        selectedUid={page.selectedUid}
        filtering={filterable.filtering}
        position={<PositionFilter table={table} />}
        filtersPanel={filterable.filtersPanel}
        filterBar={filterable.filterBar}
        scoring={<LeagueWeightingControl />}
        emptyActions={presentActions([...emptyActions, filterable.clearAction])}
      />
      {filterable.editorPopover}
    </>
  );
}
