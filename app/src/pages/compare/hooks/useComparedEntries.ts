import { useMemo } from "react";
import type { PlayerRecord } from "@/data/types";
import type { AnalysisResult } from "@/engine/index";
import { POS_GROUPS, type PosGroup } from "@/engine/positions";
import { usePlayerMinutes } from "@/player/hooks/usePlayerMinutes";
import { isKeeperRow, profileStats, statLines } from "@/player/lib/profile";
import type { Compared, Located } from "../lib/compared";
import { useSlots } from "./useSlots";

export function useComparedEntries(
  compare: readonly number[],
  analysis: AnalysisResult | null,
  players: readonly PlayerRecord[] | undefined,
  chosen: PosGroup | null,
) {
  const slots = useSlots(compare);
  const minutes = usePlayerMinutes(players);

  const located = useMemo<Located[]>(
    () => compare.map((uid) => ({ uid, i: analysis ? analysis.uids.indexOf(uid) : -1 })),
    [compare, analysis],
  );
  const first = located.find((e) => e.i >= 0);
  const group: PosGroup | null = chosen ?? (first && analysis ? POS_GROUPS[analysis.group[first.i]] : null);
  const defs = useMemo(() => (group ? profileStats(group) : []), [group]);

  const entries = useMemo<Compared[]>(() => {
    if (!analysis || !players || !minutes) return [];
    return located.flatMap(({ uid, i }) =>
      i >= 0 && players[i]?.uid === uid
        ? [
            {
              uid,
              i,
              slot: slots.get(uid) ?? 0,
              player: players[i],
              group: POS_GROUPS[analysis.group[i]],
              keeper: isKeeperRow(analysis, i),
              lines: statLines(analysis, i, minutes, defs),
            },
          ]
        : [],
    );
  }, [located, analysis, players, minutes, slots, defs]);

  return { located, group, defs, entries };
}
