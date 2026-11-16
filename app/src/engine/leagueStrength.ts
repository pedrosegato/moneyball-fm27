import type { PlayerRecord } from "@/data/types";
import { clubLeague, minutesOf, seniorFlags } from "./club";
import { leastSquares } from "./fairValue";
import { leagueKey } from "./league";
import { POS_GROUPS, type PosGroup } from "./positions";

export interface LeagueStrengthOptions {
  minMinutes: number;
  minStarters: number;
  shrinkK: number;
}

export const DEFAULT_LEAGUE_STRENGTH_OPTIONS: Readonly<LeagueStrengthOptions> = Object.freeze<LeagueStrengthOptions>({
  minMinutes: 450,
  minStarters: 15,
  shrinkK: 10,
});

export interface LeagueStrength {
  strength: number;
  starters: number;
}

export interface CoefficientOptions {
  poolMinutes: number;
  minRows?: number;
}

const MIN_ROWS = 50;

const knownCa = (r: PlayerRecord): boolean => Number.isFinite(r.ca) && r.ca > 0;

export function leagueStrengthIndex(
  players: readonly PlayerRecord[],
  { minMinutes, minStarters, shrinkK }: LeagueStrengthOptions = DEFAULT_LEAGUE_STRENGTH_OPTIONS,
): Map<string, LeagueStrength> {
  const senior = seniorFlags(players);
  const leagues = new Map<string, { sum: number; n: number }>();
  let sum = 0;
  let n = 0;
  players.forEach((r, i) => {
    const key = leagueKey(r.division);
    if (!key || !senior[i] || minutesOf(r) < minMinutes || !knownCa(r)) return;
    let league = leagues.get(key);
    if (!league) {
      league = { sum: 0, n: 0 };
      leagues.set(key, league);
    }
    league.sum += r.ca;
    league.n++;
    sum += r.ca;
    n++;
  });
  const overall = sum / n;
  const index = new Map<string, LeagueStrength>();
  for (const [key, league] of leagues) {
    if (league.n < minStarters) continue;
    index.set(key, { strength: (league.sum + shrinkK * overall) / (league.n + shrinkK), starters: league.n });
  }
  return index;
}

export function leagueStrengths(
  players: readonly PlayerRecord[],
  index: ReadonlyMap<string, LeagueStrength>,
): Float64Array {
  const senior = seniorFlags(players);
  return Float64Array.from(players, (r, i) => (senior[i] ? (index.get(leagueKey(r.division))?.strength ?? NaN) : NaN));
}

export function clubLeagueStrength(
  players: readonly PlayerRecord[],
  index: ReadonlyMap<string, LeagueStrength>,
  clubUid: number | null,
): number | null {
  const key = clubLeague(players, clubUid);
  return key === null ? null : (index.get(key)?.strength ?? null);
}

export function leagueCoefficient(
  players: readonly PlayerRecord[],
  perfByGroup: Readonly<Record<PosGroup, ArrayLike<number>>>,
  strengthOf: ArrayLike<number>,
  groupOf: readonly PosGroup[],
  { poolMinutes, minRows = MIN_ROWS }: CoefficientOptions,
): number {
  const rows: [x: number[], y: number][] = [];
  players.forEach((r, i) => {
    const perf = perfByGroup[groupOf[i]][i];
    const strength = strengthOf[i];
    if (minutesOf(r) < poolMinutes || !Number.isFinite(perf) || !Number.isFinite(strength) || !knownCa(r)) return;
    rows.push([[1, r.ca, strength], perf]);
  });
  if (rows.length < minRows || rows.every(([x]) => x[2] === rows[0][0][2])) return 0;
  const c = leastSquares(rows)[2];
  return Number.isFinite(c) ? c : 0;
}

export function adjustedPerformance(perf: number, strength: number, myStrength: number, coef: number): number {
  return Number.isFinite(strength) && Number.isFinite(myStrength) ? perf - coef * (strength - myStrength) : perf;
}

export function adjustedPerformances(
  perfBase: Readonly<Record<PosGroup, ArrayLike<number>>>,
  strength: ArrayLike<number>,
  myStrength: number | null,
  coef: number,
): Record<PosGroup, Float32Array> {
  const mine = myStrength ?? NaN;
  return Object.fromEntries(
    POS_GROUPS.map((g) => [
      g,
      Float32Array.from(perfBase[g], (perf, i) => adjustedPerformance(perf, strength[i], mine, coef)),
    ]),
  ) as Record<PosGroup, Float32Array>;
}
