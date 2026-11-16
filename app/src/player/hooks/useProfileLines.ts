import { useMemo } from "react";
import type { AnalysisResult } from "@/engine/index";
import type { PosGroup } from "@/engine/positions";
import { profileStats, statLines } from "../lib/profile";

export function useProfileLines(analysis: AnalysisResult, i: number, minutes: ArrayLike<number>, group: PosGroup) {
  const lines = useMemo(() => statLines(analysis, i, minutes), [analysis, i, minutes]);
  const profile = useMemo(() => {
    const byKey = new Map(lines.map((l) => [l.def.key, l]));
    return profileStats(group).flatMap((d) => {
      const line = byKey.get(d.key);
      return line ? [line] : [];
    });
  }, [lines, group]);
  return { lines, profile };
}
