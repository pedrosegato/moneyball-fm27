import type { PlayerRecord } from "@/data/types";

export function averageRating(r: PlayerRecord): number {
  const s = r.season;
  return s?.minutes && s.rated ? s.rating_sum / (10 * s.rated) : NaN;
}
