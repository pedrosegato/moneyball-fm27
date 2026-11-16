import { ChartScatter } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { Page } from "@/components/Page";
import { PageEmpty } from "@/components/PageEmpty";
import { Button } from "@/components/ui/button";
import { useFilterableTable } from "@/filters/hooks/useFilterableTable";
import { FILTER_TABLE } from "@/store/filters";
import { useAppStore, useMoney } from "@/store/index";
import { useBusy, useData } from "@/store/useData";
import { poolLabel } from "@/table/columns/labels";
import { usePlayerColumns } from "@/table/hooks/usePlayerColumns";
import { GraphsToolbar } from "./graphs/components/GraphsToolbar";
import { HowToRead } from "./graphs/components/HowToRead";
import { HowToReadPanel } from "./graphs/components/HowToReadPanel";
import { LabeledList } from "./graphs/components/LabeledList";
import { PlayerScatter } from "./graphs/components/PlayerScatter";
import { PlotSummary } from "./graphs/components/PlotSummary";
import { useGraphAxes } from "./graphs/hooks/useGraphAxes";
import { useGraphPoints } from "./graphs/hooks/useGraphPoints";
import { useLabeledRows } from "./graphs/hooks/useLabeledRows";
import { usePlotLevels } from "./graphs/hooks/usePlotLevels";
import { usePointHover } from "./graphs/hooks/usePointHover";
import { emptyPlotText } from "./graphs/lib/plotText";
import { selectedPoint } from "./graphs/lib/scatter";

export function Graphs() {
  const { t } = useTranslation("graphs");
  const { snapshot, analysis, visible } = useData();
  const analyzing = useBusy();
  const state = useAppStore(
    useShallow((s) => ({
      mode: s.ui.mode,
      setMode: s.setMode,
      selectedUid: s.ui.selectedUid,
      selectPlayer: s.selectPlayer,
      saved: s.ui.graphs.axes,
      labels: s.ui.graphs.labels,
      setGraphAxes: s.setGraphAxes,
      setGraphLabels: s.setGraphLabels,
      filters: s.filters.scout,
      gameDate: s.data.gameDate,
      theme: s.settings.theme,
    })),
  );
  const { mode } = state;
  const players = snapshot?.players;
  const money = useMoney();
  const { columns } = usePlayerColumns(players, analysis);
  const filterable = useFilterableTable({
    table: FILTER_TABLE.scout,
    columns,
    players,
    analysis,
    mode,
    gameDate: state.gameDate ?? snapshot?.date ?? null,
  });
  const { options, axesKey, pair, axes } = useGraphAxes(columns, state.filters, state.saved);
  const points = useGraphPoints(analysis, visible.scout, players?.length ?? 0, axes, mode);
  const { labeled, levels, noLevels } = usePlotLevels(points, axes, mode, state.labels);
  const selected = useMemo(
    () => selectedPoint(points, analysis?.uids, state.selectedUid),
    [points, analysis, state.selectedUid],
  );
  const { active, onHover, onFocusPoint } = usePointHover(points);
  const rows = useLabeledRows(labeled, levels, points, players, axes, mode);

  if (!snapshot || !analysis || !columns || !players || !axes) return null;
  const pool = poolLabel(analysis.poolMinutes);
  const { clearAction } = filterable;

  return (
    <Page>
      <GraphsToolbar
        options={options}
        pair={pair}
        axes={axes}
        onAxesChange={(next) => state.setGraphAxes(axesKey, next)}
        mode={mode}
        onModeChange={state.setMode}
        filterBar={filterable.filterBar}
        filtersPanel={filterable.filtersPanel}
      />

      <section aria-label={t("chart")} className="flex min-h-0 flex-1 flex-col">
        <HowToRead className="flex shrink-0 flex-col">
          <PlotSummary points={points} pool={pool} axes={axes} levels={levels} />
          <HowToReadPanel x={axes.x} y={axes.y} />
        </HowToRead>
        {points.rows.length === 0 ? (
          <PageEmpty
            as="div"
            icon={ChartScatter}
            title={t("empty.title")}
            description={emptyPlotText(points.inView, pool, mode, axes)}
            action={clearAction && <Button onClick={clearAction.onClick}>{clearAction.label}</Button>}
          />
        ) : (
          <div className="flex min-h-0 flex-1">
            <PlayerScatter
              players={players}
              analysis={analysis}
              axes={axes}
              points={points}
              levels={levels}
              noLevels={noLevels}
              mode={mode}
              labeled={labeled}
              selected={selected}
              active={active}
              onHover={onHover}
              onSelectPlayer={state.selectPlayer}
              stale={analyzing}
              theme={state.theme}
              money={money}
            />
            <LabeledList
              rows={rows}
              xAbbr={axes.x.abbr}
              yAbbr={axes.y.abbr}
              count={state.labels}
              onCountChange={state.setGraphLabels}
              selectedUid={state.selectedUid}
              noLevels={noLevels}
              onFocusPoint={onFocusPoint}
              onOpen={state.selectPlayer}
            />
          </div>
        )}
      </section>
      {filterable.editorPopover}
    </Page>
  );
}
