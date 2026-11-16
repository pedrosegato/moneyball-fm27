import type { PlayerRecord } from "@/data/types";
import { belongsTo, marketValue, minutesOf, seniorFlags } from "./club";
import type { PosGroup } from "./positions";

export interface ScoredPlayers<G extends string = PosGroup> {
  records: readonly PlayerRecord[];
  groups: readonly (G | null)[];
  perf: ArrayLike<number>;
}

export interface MoneyballOptions {
  minRatio: number;
  minPerf: number;
  minFair: number;
  excludeClubUid: number | null;
  minMinutes: number;
  poolMinutes: number;
}

export const DEFAULT_MONEYBALL_OPTIONS: Readonly<MoneyballOptions> = Object.freeze<MoneyballOptions>({
  minRatio: 2,
  minPerf: 60,
  minFair: 250_000,
  excludeClubUid: null,
  minMinutes: 900,
  poolMinutes: 300,
});

export function moneyballList<G extends string>(
  players: ScoredPlayers<G>,
  fv: ArrayLike<number>,
  { minRatio, minPerf, minFair, excludeClubUid, minMinutes, poolMinutes }: MoneyballOptions = DEFAULT_MONEYBALL_OPTIONS,
): number[] {
  const { records, groups, perf } = players;
  const senior = seniorFlags(records);
  const listed: { uid: number; ratio: number }[] = [];
  records.forEach((r, i) => {
    const minutes = minutesOf(r);
    const value = marketValue(r);
    if (minutes < minMinutes || minutes < poolMinutes || belongsTo(r, excludeClubUid) || !(value > 0) || !senior[i])
      return;
    if (groups[i] === null || Number.isNaN(perf[i]) || perf[i] < minPerf) return;
    const fair = fv[i];
    if (!Number.isFinite(fair) || fair < minFair) return;
    const ratio = fair / value;
    if (ratio >= minRatio) listed.push({ uid: r.uid, ratio });
  });
  return listed.sort((a, b) => b.ratio - a.ratio).map((x) => x.uid);
}
