import type { PlayerRecord } from "@/data/types";
import { clubLeague, minutesOf, seniorFlags } from "./club";
import { leagueKey } from "./league";

export const LEAGUE_WEIGHTING = { none: "none", measured: "measured" } as const;
export type LeagueWeighting = (typeof LEAGUE_WEIGHTING)[keyof typeof LEAGUE_WEIGHTING];
export const LEAGUE_WEIGHTINGS: readonly LeagueWeighting[] = Object.values(LEAGUE_WEIGHTING);
export const DEFAULT_LEAGUE_WEIGHTING: LeagueWeighting = LEAGUE_WEIGHTING.measured;

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

export function leagueFactors(strength: ArrayLike<number>): Float64Array {
  let top = Number.NEGATIVE_INFINITY;
  let bottom = Number.POSITIVE_INFINITY;
  for (let i = 0; i < strength.length; i++) {
    if (!Number.isFinite(strength[i])) continue;
    top = Math.max(top, strength[i]);
    bottom = Math.min(bottom, strength[i]);
  }
  if (!(top > 0)) return new Float64Array(strength.length).fill(1);
  return Float64Array.from(strength, (s) => (Number.isFinite(s) ? s : bottom) / top);
}
