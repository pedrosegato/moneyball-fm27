import type { PlayerRecord } from "@/data/types";
import { minutesOf } from "@/engine/club";
import { LEAGUES } from "@/engine/data/leagues";
import { defaultLeagueWeight, leagueKey, leagueRank } from "@/engine/league";
import { POS_GROUPS, type PosGroup } from "@/engine/positions";
import { leagueWeight, rankOrder, rankScores } from "@/engine/rank";
import { playableGroups } from "@/engine/universe";
import { compareLoose } from "@/lib/text";

export function rankEligible(
  players: readonly PlayerRecord[],
  poolMinutes: number,
  mask: Uint8Array | null,
  group: PosGroup | null,
): Uint8Array {
  const playable = group === null ? null : playableGroups(players);
  const bit = group === null ? 0 : 1 << POS_GROUPS.indexOf(group);
  return Uint8Array.from(players, (r, i) =>
    minutesOf(r) >= poolMinutes && (!mask || mask[i]) && (!playable || playable[i] & bit) ? 1 : 0,
  );
}

export interface RankColumns {
  base: ArrayLike<number>;
  weight: Float64Array;
  weighted: Float64Array;
  position: Float64Array;
  move: Float64Array;
  rows: Uint32Array;
}

function placesOf(order: readonly number[], n: number): Float64Array {
  const places = new Float64Array(n).fill(NaN);
  order.forEach((i, k) => {
    places[i] = k + 1;
  });
  return places;
}

export function rankColumns(
  players: readonly PlayerRecord[],
  base: ArrayLike<number>,
  eligible: Uint8Array,
  weights: Readonly<Record<string, number>>,
  weighted: boolean,
): RankColumns {
  const n = players.length;
  const byDivision = new Map<string | null, number>();
  const weight = Float64Array.from(players, (r) => {
    let w = byDivision.get(r.division);
    if (w === undefined) {
      w = leagueWeight(r.division, weights);
      byDivision.set(r.division, w);
    }
    return w;
  });
  const plainOrder = rankOrder(base, eligible);
  const plain = placesOf(plainOrder, n);
  if (!weighted) {
    const none = () => new Float64Array(n).fill(NaN);
    return { base, weight, weighted: none(), position: plain, move: none(), rows: Uint32Array.from(plainOrder) };
  }
  const scores = rankScores(players, base, weights);
  const order = rankOrder(scores, eligible);
  const position = placesOf(order, n);
  const move = Float64Array.from(position, (p, i) => plain[i] - p);
  for (let i = 0; i < n; i++) if (Number.isNaN(position[i])) scores[i] = NaN;
  return { base, weight, weighted: scores, position, move, rows: Uint32Array.from(order) };
}

export interface LeagueRow {
  key: string;
  name: string;
  rank: number | null;
  nation: string | null;
  players: number;
  weight: number;
}

export function leagueRows(players: readonly PlayerRecord[]): LeagueRow[] {
  const rows = new Map<string, LeagueRow>();
  for (const r of players) {
    const division = r.division;
    const key = leagueKey(division);
    if (!key || !division) continue;
    const row = rows.get(key);
    if (row) {
      row.players++;
      continue;
    }
    const at = leagueRank(key);
    rows.set(key, {
      key,
      name: division,
      rank: at === undefined ? null : at + 1,
      nation: at === undefined ? null : LEAGUES[at][1],
      players: 1,
      weight: defaultLeagueWeight(key),
    });
  }
  return [...rows.values()].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || compareLoose(a.name, b.name));
}

const atShown = (w: number) => Math.round(w * 1000) / 1000;

export function weightsWith(
  weights: Readonly<Record<string, number>>,
  key: string,
  weight: number,
  fallback: number,
): Record<string, number> {
  const { [key]: _old, ...rest } = weights;
  const shown = atShown(weight);
  return shown === atShown(fallback) ? rest : { ...rest, [key]: shown };
}
