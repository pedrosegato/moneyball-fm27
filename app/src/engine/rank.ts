import type { PlayerRecord } from "@/data/types";
import { defaultLeagueWeight, leagueKey } from "./league";

export function averageRating(r: PlayerRecord): number {
  const s = r.season;
  return s?.minutes && s.rated ? s.rating_sum / (10 * s.rated) : NaN;
}

export function leagueWeight(division: string | null, overrides?: Readonly<Record<string, number>>): number {
  const key = leagueKey(division);
  return overrides && Object.hasOwn(overrides, key) ? overrides[key] : defaultLeagueWeight(key);
}

export function rankScores(
  players: readonly PlayerRecord[],
  pct: ArrayLike<number>,
  leagueWeights?: Readonly<Record<string, number>>,
): Float64Array {
  const weights = new Map<string | null, number>();
  return Float64Array.from(players, (r, i) => {
    let w = weights.get(r.division);
    if (w === undefined) {
      w = leagueWeight(r.division, leagueWeights);
      weights.set(r.division, w);
    }
    return pct[i] * w;
  });
}

export function rankOrder(scores: ArrayLike<number>, eligible: Uint8Array): number[] {
  const order: number[] = [];
  for (let i = 0; i < eligible.length; i++) if (eligible[i] && !Number.isNaN(scores[i])) order.push(i);
  return order.sort((a, b) => scores[b] - scores[a]);
}
