import { REFMIN, rankPercentile } from "@/engine/percentiles";
import { type FitRow, type FitVerdict, fitVerdict } from "@/engine/tacticalFit";

export const FIT_VERDICTS: readonly FitVerdict[] = ["upgrade", "replacement", "downgrade"];

export function countVerdicts(rows: readonly FitRow[], lvl: number): Record<FitVerdict, number> {
  const counts: Record<FitVerdict, number> = { upgrade: 0, replacement: 0, downgrade: 0 };
  for (const r of rows) {
    const v = fitVerdict(r.diff, lvl);
    if (v) counts[v]++;
  }
  return counts;
}

export interface FitColumns {
  order: Float64Array;
  perf: Float64Array;
  diff: Float64Array;
  style: Float64Array;
  ability: Float64Array;
  abilityDiff: Float64Array;
  abilityPct: Float64Array;
  abilityPctDiff: Float64Array;
  rows: Uint32Array;
}

export function fitColumns(
  players: number,
  rows: readonly FitRow[],
  abilityOf: (i: number) => number,
  mineAbility: number,
): FitColumns {
  const blank = () => new Float64Array(players).fill(NaN);
  const cols = {
    order: blank(),
    perf: blank(),
    diff: blank(),
    style: blank(),
    ability: blank(),
    abilityDiff: blank(),
    abilityPct: blank(),
    abilityPctDiff: blank(),
  };
  const abilities = rows.map((r) => abilityOf(r.index));
  rows.forEach((r, k) => {
    cols.order[r.index] = k;
    cols.perf[r.index] = r.perf;
    cols.diff[r.index] = r.diff;
    cols.style[r.index] = r.style;
    cols.ability[r.index] = abilities[k];
    cols.abilityDiff[r.index] = abilities[k] - mineAbility;
  });
  const ranked = [...abilities, mineAbility].filter((a) => !Number.isNaN(a)).sort((a, b) => a - b);
  if (ranked.length >= REFMIN) {
    const pctOf = (a: number) => {
      const below = lowerBound(ranked, a);
      return rankPercentile(below, lowerBound(ranked, a, true) - below, ranked.length);
    };
    const minePct = Number.isNaN(mineAbility) ? NaN : pctOf(mineAbility);
    rows.forEach((r, k) => {
      if (Number.isNaN(abilities[k])) return;
      cols.abilityPct[r.index] = pctOf(abilities[k]);
      cols.abilityPctDiff[r.index] = cols.abilityPct[r.index] - minePct;
    });
  }
  return { ...cols, rows: Uint32Array.from(rows, (r) => r.index) };
}

function lowerBound(sorted: readonly number[], v: number, after = false): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < v || (after && sorted[mid] === v)) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
