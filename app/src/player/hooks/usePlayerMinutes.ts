import { useMemo } from "react";
import type { PlayerRecord } from "@/data/types";
import { minutesOf } from "@/engine/club";

export function usePlayerMinutes(players: readonly PlayerRecord[] | undefined): Float64Array | null {
  return useMemo(() => (players ? Float64Array.from(players, minutesOf) : null), [players]);
}
