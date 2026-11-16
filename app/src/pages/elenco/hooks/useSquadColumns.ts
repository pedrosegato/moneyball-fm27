import { useMemo } from "react";
import type { PlayerRecord } from "@/data/types";
import type { AnalysisResult } from "@/engine/index";
import type { SellKeepOptions } from "@/engine/sellKeep";
import { usePlayerColumns } from "@/table/hooks/usePlayerColumns";
import { slotColumns } from "../lib/slotColumns";
import { squadColumns } from "../lib/squadColumns";

export interface SquadColumnsSource {
  players: readonly PlayerRecord[];
  analysis: AnalysisResult;
  club: number;
  slot: number;
  slotRole: string | null;
  xi: readonly (number | null)[];
  bench: readonly number[];
  options: SellKeepOptions;
}

export function useSquadColumns({ players, analysis, club, slot, slotRole, xi, bench, options }: SquadColumnsSource) {
  const { composites, columns: base } = usePlayerColumns(players, analysis);
  const { slots } = analysis.lineup;
  const xiSlotOf = useMemo(() => {
    const held = new Map(xi.flatMap((i, s) => (i === null ? [] : [[i, s] as const])));
    return (index: number) => held.get(index) ?? null;
  }, [xi]);
  const columns = useMemo(
    () =>
      slotColumns(squadColumns(base ?? [], { players, analysis, clubUid: club, options }), {
        analysis,
        players,
        slot,
        xiSlotOf,
        slots,
        slotRole,
        bench,
      }),
    [base, players, analysis, club, options, slot, slotRole, xiSlotOf, slots, bench],
  );
  return { composites, columns };
}
