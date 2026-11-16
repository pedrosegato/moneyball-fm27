import type { PlayerRecord } from "@/data/types";
import { belongsTo, clubLeague, minutesOf, playsFor, seniorFlags } from "./club";
import type { PercentileColumns } from "./composites";
import { type LeagueFilter, leagueMatcher } from "./league";
import { slotGroup } from "./positions";
import type { StatKey } from "./stats/catalog";

export const FORMATIONS: Readonly<Record<string, readonly string[]>> = {
  "4-3-3": ["GK", "D(L)", "D(C)", "D(C)", "D(R)", "DM", "M(C)", "M(C)", "AM(L)", "AM(R)", "ST(C)"],
  "4-2-3-1": ["GK", "D(L)", "D(C)", "D(C)", "D(R)", "DM", "DM", "AM(L)", "AM(C)", "AM(R)", "ST(C)"],
  "4-4-2": ["GK", "D(L)", "D(C)", "D(C)", "D(R)", "M(L)", "M(C)", "M(C)", "M(R)", "ST(C)", "ST(C)"],
  "4-1-4-1": ["GK", "D(L)", "D(C)", "D(C)", "D(R)", "DM", "M(L)", "M(C)", "M(C)", "M(R)", "ST(C)"],
  "3-5-2": ["GK", "D(C)", "D(C)", "D(C)", "WB(L)", "DM", "M(C)", "M(C)", "WB(R)", "ST(C)", "ST(C)"],
  "3-4-3": ["GK", "D(C)", "D(C)", "D(C)", "WB(L)", "M(C)", "M(C)", "WB(R)", "AM(L)", "AM(R)", "ST(C)"],
  "5-3-2": ["GK", "WB(L)", "D(C)", "D(C)", "D(C)", "WB(R)", "M(C)", "M(C)", "M(C)", "ST(C)", "ST(C)"],
};

export const DEFAULT_FORMATION = "4-3-3";

export interface LineupChoice {
  picks?: Readonly<Record<number, number | null>>;
  slots?: readonly string[];
}

export interface Lineup {
  slots: readonly string[];
  xi: (number | null)[];
}

export function placePicks(
  records: readonly PlayerRecord[],
  clubUid: number | null,
  slotCount: number,
  picks: LineupChoice["picks"] = {},
): (number | null)[] {
  const byUid = new Map(records.flatMap((r, i) => (playsFor(r, clubUid) ? [[r.uid, i] as const] : [])));
  const used = new Set<number>();
  return Array.from({ length: slotCount }, (_, s) => {
    const pick = picks[s];
    const i = pick == null ? undefined : byUid.get(pick);
    if (i === undefined || used.has(i)) return null;
    used.add(i);
    return i;
  });
}

const LINEUP_SIZE = 11;

const isLineupSlots = (slots: readonly string[] | undefined): slots is readonly string[] =>
  slots?.length === LINEUP_SIZE && slots.every((s) => slotGroup(s) !== null);

export function pickLineup(
  records: readonly PlayerRecord[],
  positions: readonly ReadonlySet<string>[],
  clubUid: number | null,
  formation: string = DEFAULT_FORMATION,
  { picks = {}, slots: explicit }: LineupChoice = {},
): Lineup {
  const slots = isLineupSlots(explicit) ? explicit : (FORMATIONS[formation] ?? FORMATIONS[DEFAULT_FORMATION]);
  const pool = records.flatMap((r, i) => (playsFor(r, clubUid) ? [i] : []));
  const xi = placePicks(records, clubUid, slots.length, picks);
  const used = new Set(xi.filter((i) => i !== null));
  slots.forEach((pos, s) => {
    if (xi[s] !== null || picks[s] !== undefined) return;
    const [best] = pool
      .filter((i) => !used.has(i) && positions[i].has(pos))
      .sort((a, b) => minutesOf(records[b]) - minutesOf(records[a]));
    if (best !== undefined) {
      xi[s] = best;
      used.add(best);
    }
  });
  return { slots, xi };
}

export type FitVerdict = "upgrade" | "replacement" | "downgrade";

export interface FitOptions {
  lvl: number;
  minMinutes: number;
  poolMinutes: number;
  styleMin: number;
  leagueFilter: LeagueFilter;
}

export const DEFAULT_FIT_OPTIONS: Readonly<FitOptions> = Object.freeze<FitOptions>({
  lvl: 8,
  minMinutes: 900,
  poolMinutes: 300,
  styleMin: 60,
  leagueFilter: Object.freeze<LeagueFilter>({ kind: "myLeagueOrStronger" }),
});

export interface FitSlot {
  pos: string;
  mine: number | null;
}

export interface FitContext<G extends string> {
  records: readonly PlayerRecord[];
  positions: readonly ReadonlySet<string>[];
  pct: PercentileColumns;
  keyStats: Readonly<Partial<Record<G, readonly StatKey[]>>>;
  slotGroup: (slot: string) => G | null;
  clubUid: number | null;
  senior: Uint8Array;
  clubLeague: string | null;
}

export function fitContext<G extends string>(base: Omit<FitContext<G>, "senior" | "clubLeague">): FitContext<G> {
  return { ...base, senior: seniorFlags(base.records), clubLeague: clubLeague(base.records, base.clubUid) };
}

export type PerformanceByGroup<G extends string> = Readonly<Partial<Record<G, ArrayLike<number>>>>;

export interface FitRow {
  index: number;
  perf: number;
  diff: number;
  style: number;
  verdict: FitVerdict | null;
}

const MIN_STYLE_KNOWN = 0.6;

function styleMatch(pct: PercentileColumns, keys: readonly StatKey[], a: number, b: number): number {
  let gap = 0;
  let known = 0;
  for (const k of keys) {
    const col = pct[k];
    const x = col ? col[a] : NaN;
    const y = col ? col[b] : NaN;
    if (!Number.isNaN(x) && !Number.isNaN(y)) {
      gap += Math.abs(x - y);
      known++;
    }
  }
  return known && known >= keys.length * MIN_STYLE_KNOWN ? Math.round(100 - gap / known) : NaN;
}

export function fitVerdict(diff: number, lvl: number): FitVerdict | null {
  if (Number.isNaN(diff)) return null;
  return diff >= lvl ? "upgrade" : diff <= -lvl ? "downgrade" : "replacement";
}

export function tacticalFit<G extends string>(
  slot: FitSlot,
  candidates: FitContext<G>,
  perf: PerformanceByGroup<G>,
  { lvl, minMinutes, poolMinutes, styleMin, leagueFilter }: FitOptions = DEFAULT_FIT_OPTIONS,
): FitRow[] {
  const { records, positions, pct, keyStats, slotGroup, clubUid, senior } = candidates;
  const group = slotGroup(slot.pos);
  const column = group === null ? undefined : perf[group];
  if (group === null || !column) return [];
  const keys = keyStats[group] ?? [];
  const { mine } = slot;
  const minePerf = mine === null ? NaN : column[mine];
  const inLeague = leagueMatcher(leagueFilter, candidates.clubLeague);

  const rows: FitRow[] = [];
  records.forEach((r, i) => {
    const minutes = minutesOf(r);
    if (minutes < minMinutes || minutes < poolMinutes || belongsTo(r, clubUid) || !senior[i]) return;
    if (!positions[i].has(slot.pos) || !inLeague(r.division)) return;
    const p = column[i];
    if (Number.isNaN(p)) return;
    const style = mine === null ? NaN : styleMatch(pct, keys, i, mine);
    if (mine !== null && !(style >= styleMin)) return;
    const diff = p - minePerf;
    rows.push({ index: i, perf: p, diff, style, verdict: fitVerdict(diff, lvl) });
  });
  const key = (r: FitRow) => (Number.isNaN(r.diff) ? r.perf : r.diff);
  return rows.sort((a, b) => key(b) - key(a) || (b.style || 0) - (a.style || 0));
}
