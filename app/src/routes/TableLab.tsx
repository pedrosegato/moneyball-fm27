import { type CSSProperties, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { POS_GROUPS, type PosGroup } from "@/engine/positions";
import { useHash } from "@/shell/Router";
import { TABLE_LAB_HASH } from "@/shell/routeIds";
import type { ColumnsState } from "@/store/columns";
import { SEARCH_KEY, VALUE_MODE, type ValueMode } from "@/store/ui";
import { allRows, analyzeFixture, demoPlayers, worstCasePlayers } from "@/table/fixtures";
import { PlayerTableView } from "@/table/PlayerTableView";
import { PLAYER_ACTIONS } from "@/table/playerActions";

const DATASETS = ["demo", "worst", "empty", "one"] as const;
type Dataset = (typeof DATASETS)[number];

function datasetOf(hash: string): Dataset {
  const name = /[?&]data=(\w+)/.exec(hash)?.[1];
  return DATASETS.find((dataset) => dataset === name) ?? "demo";
}

function sourceFor(dataset: Dataset) {
  const players =
    dataset === "worst"
      ? [...worstCasePlayers(), ...demoPlayers(30)]
      : dataset === "one"
        ? demoPlayers(1)
        : demoPlayers(40);
  const source = analyzeFixture(players);
  return { source, rows: dataset === "empty" ? new Uint32Array() : allRows(players.length) };
}

const IGNORE_OPEN = () => {};

const TOGGLE: CSSProperties = {
  position: "fixed",
  bottom: 16,
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  gap: 2,
  padding: 2,
  borderRadius: 8,
  background: "#d4d4d8",
  font: "12px system-ui, sans-serif",
  zIndex: 100,
};

export default function TableLab() {
  const { t } = useTranslation("shell");
  const dataset = datasetOf(useHash());
  const { source, rows } = useMemo(() => sourceFor(dataset), [dataset]);
  const [mode, setMode] = useState<ValueMode>(VALUE_MODE.value);
  const [group, setGroup] = useState<PosGroup | null>(null);
  const [columns, setColumns] = useState<ColumnsState>({ presets: {}, groups: [] });

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background text-foreground">
        <PlayerTableView
          rows={rows}
          players={source.players}
          analysis={source.analysis}
          composites={source.composites}
          mode={mode}
          onModeChange={setMode}
          columnState={{ group, ...columns }}
          columnActions={{
            setColumnPreset: (key, list) => setColumns((c) => ({ ...c, presets: { ...c.presets, [key]: list } })),
            resetColumnPreset: (key) =>
              setColumns((c) => {
                const { [key]: _reset, ...presets } = c.presets;
                return { ...c, presets };
              }),
            setColumnGroups: (groups) => setColumns((c) => ({ ...c, groups })),
          }}
          onOpenPlayer={IGNORE_OPEN}
          selectionActions={PLAYER_ACTIONS}
          searchKey={SEARCH_KEY.scout}
        />
      </div>
      <div style={TOGGLE}>
        <select
          aria-label={t("lab.position")}
          value={group ?? ""}
          onChange={(e) => setGroup((e.target.value || null) as PosGroup | null)}
          style={{ font: "inherit", border: 0, borderRadius: 6, padding: "4px 6px", background: "transparent" }}
        >
          <option value="">{t("lab.noPosition")}</option>
          {POS_GROUPS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        {DATASETS.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={d === dataset}
            onClick={() => (window.location.hash = `${TABLE_LAB_HASH}?data=${d}`)}
            style={{
              font: "inherit",
              border: 0,
              borderRadius: 6,
              padding: "4px 10px",
              color: "#18181b",
              background: d === dataset ? "#ffffff" : "transparent",
            }}
          >
            {t(`lab.dataset.${d}`)}
          </button>
        ))}
      </div>
    </TooltipProvider>
  );
}
