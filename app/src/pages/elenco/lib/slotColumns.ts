import type { PlayerRecord } from "@/data/types";
import { squadRolePerf } from "@/engine/analysis/squadRoles";
import type { AnalysisResult } from "@/engine/index";
import { slotCode, slotGroup } from "@/engine/positions";
import { isRoleId } from "@/engine/roles/catalog";
import type { TableColumn } from "@/table/columns/types";
import { customColumn } from "@/table/lib/customColumn";
import { elencoT } from "./elencoT";
import { withSlotPerformance } from "./slotPerformance";

export const SLOT_COLUMN = { xiSlot: "xiSlot" } as const;

interface SlotSource {
  analysis: AnalysisResult;
  players: readonly PlayerRecord[];
  slot: number;
  xiSlotOf(index: number): number | null;
  slots: readonly string[];
  slotRole: string | null;
  bench: readonly number[];
}

export function slotColumns(
  base: readonly TableColumn[],
  { analysis, players, slot, xiSlotOf, slots, slotRole, bench }: SlotSource,
): TableColumn[] {
  const group = slotGroup(slots[slot]);
  const groupPerf = group ? analysis.perfIn[group] : null;
  const perfOf = squadRolePerf(analysis.squadRoles);
  const role = slotRole !== null && isRoleId(slotRole) ? slotRole : null;
  const inSlot = (i: number) => (role ? perfOf(i, role) : groupPerf ? groupPerf[i] : NaN);
  const perf = Float32Array.from(analysis.perf, (_, i) => inSlot(i));
  const benchOrder = new Map(bench.map((uid, k) => [uid, k]));
  const benchAt = (i: number) => benchOrder.get(players[i].uid);
  const benchLabel = elencoT("slotColumns.xiSlot.bench");
  const placeOf = (i: number) => {
    const s = xiSlotOf(i);
    if (s !== null) return slotCode(slots[s]);
    return benchAt(i) === undefined ? null : benchLabel;
  };
  const lineupOrder = (i: number) => xiSlotOf(i) ?? slots.length + (benchAt(i) ?? Number.NaN);
  const xiSlotAbbr = elencoT("slotColumns.xiSlot.abbr");
  return [
    ...withSlotPerformance(base, perf, analysis.pool),
    customColumn({
      id: SLOT_COLUMN.xiSlot,
      abbr: xiSlotAbbr,
      label: elencoT("slotColumns.xiSlot.label"),
      description: elencoT("slotColumns.xiSlot.description"),
      width: 84,
      align: "start",
      sortKey: () => Float64Array.from(perf, (_, i) => lineupOrder(i)),
      exports: [{ header: xiSlotAbbr, get: placeOf }],
      render: (i) => placeOf(i) ?? "",
    }),
  ];
}
