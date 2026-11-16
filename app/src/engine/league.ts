import { LALIAS, LEAGUES } from "./data/leagues";

const normalize = (name: string | null | undefined): string => (name ?? "").trim().toLowerCase();

const ALIAS = new Map(Object.entries(LALIAS).map(([from, to]) => [normalize(from), normalize(to)]));

const RANK = new Map<string, number>();
LEAGUES.forEach(([name], i) => {
  const key = normalize(name);
  if (!RANK.has(key)) RANK.set(key, i);
});

export const TOP5_LEAGUES: readonly string[] = [
  "premier league",
  "laliga ea sports",
  "serie a enilive",
  "bundesliga",
  "ligue 1 mcdonald's",
];

export function leagueKey(division: string | null | undefined): string {
  const key = normalize(division);
  return ALIAS.get(key) || key;
}

export function leagueRank(key: string): number | undefined {
  return RANK.get(key);
}

export function defaultLeagueWeight(key: string): number {
  const rank = RANK.get(key);
  return rank === undefined ? 1 : LEAGUES[rank][2];
}

export type LeagueFilter =
  | { kind: "any" }
  | { kind: "top5" }
  | { kind: "myLeagueOrStronger" }
  | { kind: "myLeague" }
  | { kind: "league"; key: string };

export function leagueMatcher(filter: LeagueFilter, myLeague: string | null): (division: string | null) => boolean {
  switch (filter.kind) {
    case "any":
      return () => true;
    case "top5":
      return (d) => TOP5_LEAGUES.includes(leagueKey(d));
    case "myLeagueOrStronger": {
      const mine = (myLeague === null ? undefined : RANK.get(myLeague)) ?? Infinity;
      return (d) => (RANK.get(leagueKey(d)) ?? Infinity) <= mine;
    }
    case "myLeague":
      return (d) => leagueKey(d) === myLeague;
    case "league":
      return (d) => leagueKey(d) === filter.key;
  }
}
