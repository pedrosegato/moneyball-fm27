import { useMemo } from "react";
import type { PlayerRecord } from "@/data/types";
import { abilityAt } from "@/engine/ability";
import type { AnalysisResult } from "@/engine/index";
import { slotGroup } from "@/engine/positions";
import { usePlayerColumns } from "@/table/hooks/usePlayerColumns";
import { fitColumns } from "../lib/fitRows";
import { fitTableColumns } from "../lib/fitTableColumns";

export function useSigningsColumns(
  players: readonly PlayerRecord[],
  analysis: AnalysisResult,
  slot: number,
  lvl: number,
) {
  const pos = analysis.lineup.slots[slot];
  const group = slotGroup(pos);
  const mine = analysis.lineup.xi[slot];
  const candidates = analysis.fit[slot];
  const mineAbility = mine === null ? NaN : abilityAt(players[mine].attrs, pos);
  const cols = useMemo(
    () => fitColumns(players.length, candidates, (i) => abilityAt(players[i].attrs, pos), mineAbility),
    [players, candidates, pos, mineAbility],
  );
  const { composites, columns: base } = usePlayerColumns(players, analysis);
  const columns = useMemo(
    () => (group && base ? fitTableColumns(base, { cols, group, lvl, pool: analysis.pool }) : null),
    [base, cols, group, lvl, analysis.pool],
  );
  return { group, composites, columns };
}
