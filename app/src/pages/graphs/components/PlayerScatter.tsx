import { useCallback } from "react";
import type { PlayerRecord } from "@/data/types";
import type { AnalysisResult } from "@/engine/index";
import { POS_GROUPS } from "@/engine/positions";
import type { Money } from "@/lib/money";
import { playerName } from "@/lib/playerName";
import type { ValueMode } from "@/store/ui";
import type { PointLevels } from "../lib/levels";
import type { Axis, PointSet } from "../lib/scatter";
import { PointTooltip } from "./PointTooltip";
import { ScatterPlot } from "./ScatterPlot";

interface PlayerScatterProps {
  players: readonly PlayerRecord[];
  analysis: AnalysisResult;
  axes: { x: Axis; y: Axis };
  points: PointSet;
  levels: PointLevels | null;
  noLevels: string | undefined;
  mode: ValueMode;
  labeled: readonly number[];
  selected: number;
  active: number;
  onHover(k: number): void;
  onSelectPlayer(uid: number): void;
  stale: boolean;
  theme: string;
  money: Money;
}

export function PlayerScatter({
  players,
  analysis,
  axes,
  points,
  levels,
  noLevels,
  mode,
  labeled,
  selected,
  active,
  onHover,
  onSelectPlayer,
  stale,
  theme,
  money,
}: PlayerScatterProps) {
  const uidOf = useCallback((k: number) => players[points.rows[k]].uid, [players, points]);
  const nameOf = useCallback((k: number) => playerName(players[points.rows[k]]), [players, points]);
  const tooltip = useCallback(
    (k: number) => {
      const i = points.rows[k];
      return (
        <PointTooltip
          player={players[i]}
          i={i}
          group={POS_GROUPS[analysis.group[i]]}
          axes={axes}
          level={levels ? levels.pct[k] : NaN}
          noLevels={noLevels}
          money={money}
        />
      );
    },
    [points, levels, noLevels, players, analysis, axes, money],
  );
  return (
    <ScatterPlot
      points={points}
      levels={levels}
      x={axes.x}
      y={axes.y}
      mode={mode}
      labeled={labeled}
      selected={selected}
      active={active}
      uidOf={uidOf}
      nameOf={nameOf}
      tooltip={tooltip}
      onHover={onHover}
      onOpen={(k) => onSelectPlayer(uidOf(k))}
      stale={stale}
      theme={theme}
    />
  );
}
