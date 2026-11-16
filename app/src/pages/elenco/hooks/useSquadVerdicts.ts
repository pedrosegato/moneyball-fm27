import { useMemo, useState } from "react";
import type { PlayerRecord } from "@/data/types";
import type { AnalysisResult } from "@/engine/index";
import { SELL_KEEP_VERDICTS, type SellKeepVerdict } from "@/engine/sellKeep";
import { ALL, type All } from "@/lib/constants";
import { FILTER_TABLE } from "@/store/filters";
import { useData } from "@/store/useData";
import { currentMask, useStableRows } from "@/table/lib/rows";

export type SquadVerdictFilter = SellKeepVerdict | All;

export function useSquadVerdicts(
  players: readonly PlayerRecord[],
  analysis: AnalysisResult,
  inTeam: readonly number[],
) {
  const { visible } = useData();
  const [verdict, setVerdict] = useState<SquadVerdictFilter>(ALL);
  const counts = useMemo(() => {
    const out = new Map<SellKeepVerdict, number>();
    for (const i of inTeam) {
      const v = analysis.sellKeep[players[i].uid]?.verdict;
      if (v) out.set(v, (out.get(v) ?? 0) + 1);
    }
    return out;
  }, [inTeam, analysis, players]);
  const total = useMemo(() => [...counts.values()].reduce((a, b) => a + b, 0), [counts]);
  const shown: SquadVerdictFilter = verdict !== ALL && counts.has(verdict) ? verdict : ALL;
  const present = SELL_KEEP_VERDICTS.flatMap((v) => {
    const n = counts.get(v);
    return n === undefined ? [] : [{ verdict: v, n }];
  });

  const mask = currentMask(visible[FILTER_TABLE.squad], players.length);
  const rows = useStableRows(
    useMemo(() => {
      const listed = mask ? inTeam.filter((i) => mask[i]) : inTeam;
      if (shown === ALL) return Uint32Array.from(listed);
      return Uint32Array.from(listed.filter((i) => analysis.sellKeep[players[i].uid]?.verdict === shown));
    }, [inTeam, mask, analysis, players, shown]),
  );
  return { total, verdict: shown, setVerdict, present, rows };
}
export type SquadVerdicts = ReturnType<typeof useSquadVerdicts>;
