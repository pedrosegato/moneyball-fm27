import type { MissingReason } from "@/components/missing";
import type { PitchLevel, PitchPosition } from "@/components/pitch";
import { STYLE_STATS } from "@/engine/data/groups";
import type { AnalysisResult } from "@/engine/index";
import { referenceOf } from "@/engine/percentiles";
import { GK, naturalPositions, POS_GROUPS, type PosGroup } from "@/engine/positions";
import { STATS, type StatDef, statIndex } from "@/engine/stats/catalog";
import { missingReason, statSamples } from "@/table/columns/missing";

export type StatAnalysis = Pick<AnalysisResult, "cols" | "pct" | "reference" | "group" | "pool">;

export interface StatLine {
  def: StatDef;
  value: number;
  pct: number;
  median: number;
  top: number;
  missing?: MissingReason;
}

export const TOP_STATS = 10;

export const isKeeperRow = (analysis: Pick<AnalysisResult, "group">, i: number): boolean =>
  POS_GROUPS[analysis.group[i]] === GK;

export function statLines(
  analysis: StatAnalysis,
  i: number,
  minutes: ArrayLike<number>,
  defs: readonly StatDef[] = STATS,
): StatLine[] {
  return defs.map((def) => {
    const value = analysis.cols[def.key];
    const pct = analysis.pct[def.key];
    const { median, top } = referenceOf(analysis.reference, def.key, analysis.group[i]);
    return {
      def,
      value: value[i],
      pct: pct[i],
      median,
      top,
      missing: missingReason(i, value, pct, statSamples(def, analysis.cols, minutes), analysis.pool),
    };
  });
}

const isTopCandidate = (def: StatDef) => def.unit !== "count" && def.group !== "disciplina" && def.key !== "Mins/Gm";

export function topStats(lines: readonly StatLine[], n = TOP_STATS): StatLine[] {
  return lines
    .filter((l) => !Number.isNaN(l.pct) && isTopCandidate(l.def))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, n);
}

const KNOWN = new Set(STATS.map((d) => d.key));

export function profileStats(group: PosGroup): StatDef[] {
  return STYLE_STATS[group].flatMap((key) => (KNOWN.has(key) ? [STATS[statIndex(key)]] : []));
}

const NATURAL = 18;
const SECONDARY = 15;

export function pitchLevels(pos: number[]): Partial<Record<PitchPosition, PitchLevel>> {
  const levels: Partial<Record<PitchPosition, PitchLevel>> = {};
  for (const p of naturalPositions(pos, SECONDARY)) levels[p] = "secundaria";
  for (const p of naturalPositions(pos, NATURAL)) levels[p] = "natural";
  return levels;
}
