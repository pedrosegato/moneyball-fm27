import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { ToggleChip } from "@/components/ToggleChip";
import type { PlayerRecord } from "@/data/types";
import { COLUMN } from "@/engine/columnIds";
import type { AnalysisResult } from "@/engine/index";
import type { FitRow } from "@/engine/tacticalFit";
import { useFilterableTable } from "@/filters/hooks/useFilterableTable";
import { FILTER_TABLE } from "@/store/filters";
import { useAppStore } from "@/store/index";
import { SEARCH_KEY } from "@/store/ui";
import type { TableColumnState } from "@/table/columns/types";
import type { EmptyAction } from "@/table/components/TableEmpty";
import { useTablePageState } from "@/table/hooks/useTablePageState";
import { PlayerTable } from "@/table/PlayerTable";
import { PLAYER_ACTIONS } from "@/table/playerActions";
import { useSigningsColumns } from "../hooks/useSigningsColumns";
import { useSigningsVerdicts } from "../hooks/useSigningsVerdicts";
import { FIT_FIXED, FIT_SORT } from "../lib/fitTableColumns";
import { undervaluedSet } from "../lib/undervalued";
import { FitCriteria } from "./FitCriteria";
import { SigningsVerdicts } from "./SigningsVerdicts";

const MONEYBALL_FIXED = [...FIT_FIXED, COLUMN.fair, COLUMN.valueRatio];

interface SigningsTabProps {
  players: readonly PlayerRecord[];
  analysis: AnalysisResult;
  slot: number;
  signings: readonly FitRow[];
  gameDate: string | null;
}

export function SigningsTab({ players, analysis, slot, signings, gameDate }: SigningsTabProps) {
  const { t } = useTranslation(["elenco", "common"]);
  const page = useTablePageState();
  const store = useAppStore(
    useShallow((s) => ({
      lvl: s.settings.engine.fit.lvl,
      undervaluedOnly: s.ui.signingsMoneyball,
      setUndervaluedOnly: s.setSigningsMoneyball,
    })),
  );
  const [lvlDraft, setLvlDraft] = useState<number | null>(null);
  const lvl = lvlDraft ?? store.lvl;
  const { group, composites, columns } = useSigningsColumns(players, analysis, slot, lvl);
  const verdicts = useSigningsVerdicts(analysis, slot, signings, lvl);
  const filters = useFilterableTable({
    table: FILTER_TABLE.signings,
    columns,
    players,
    analysis,
    mode: page.mode,
    gameDate,
  });
  const undervalued = useMemo(() => undervaluedSet(analysis), [analysis]);
  const columnState = useMemo<TableColumnState>(
    () => ({ group, ...page.columns, fixed: store.undervaluedOnly ? MONEYBALL_FIXED : FIT_FIXED }),
    [group, page.columns, store.undervaluedOnly],
  );

  if (!columns) return null;

  const candidates = analysis.fit[slot];
  const listed = store.undervaluedOnly ? candidates.filter((r) => undervalued.has(r.index)) : candidates;
  const ways: EmptyAction[] = [];
  if (store.undervaluedOnly)
    ways.push({ label: t("signings.showAll"), onClick: () => store.setUndervaluedOnly(false) });
  if (filters.clearAction) ways.push(filters.clearAction);

  return (
    <>
      <SigningsVerdicts
        counts={verdicts.counts}
        verdict={verdicts.verdict}
        lvl={lvl}
        onVerdict={verdicts.pickVerdict}
      />
      <PlayerTable
        key={`${slot}${store.undervaluedOnly ? "-moneyball" : ""}`}
        rows={verdicts.rows}
        total={listed.length}
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
        filtering={filters.filtering}
        defaultSort={FIT_SORT}
        selectionActions={PLAYER_ACTIONS}
        searchKey={SEARCH_KEY.signings}
        filtersPanel={filters.filtersPanel}
        chips={
          <ToggleChip
            label={t("common:onlyUndervalued")}
            on={store.undervaluedOnly}
            onChange={store.setUndervaluedOnly}
          />
        }
        filterBar={filters.filterBar}
        criteria={<FitCriteria lvl={lvl} onLvlDraft={setLvlDraft} />}
        emptyDescription={
          store.undervaluedOnly && listed.length === 0 ? t("signings.noUndervalued") : t("signings.empty")
        }
        emptyActions={ways}
      />
      {filters.editorPopover}
    </>
  );
}
