import type { PlayerRecord } from "@/data/types";
import { playerName } from "@/lib/playerName";
import type { ValueMode } from "@/store/ui";
import type { PointLevels } from "./levels";
import { shownValue } from "./plotText";
import type { Axis, PointSet } from "./scatter";

export interface LabeledRow {
  k: number;
  uid: number;
  name: string;
  x: string;
  y: string;
  level: number;
}

interface LabeledRowsInput {
  labeled: readonly number[];
  levels: PointLevels | null;
  points: PointSet;
  players: readonly PlayerRecord[];
  axes: { x: Axis; y: Axis };
  mode: ValueMode;
}

export function labeledRows({ labeled, levels, points, players, axes, mode }: LabeledRowsInput): LabeledRow[] {
  return labeled.map((k) => {
    const i = points.rows[k];
    return {
      k,
      uid: players[i].uid,
      name: playerName(players[i]),
      x: shownValue(axes.x, i, mode),
      y: shownValue(axes.y, i, mode),
      level: levels ? levels.pct[k] : NaN,
    };
  });
}
