import type { PastSeason, PlayerRecord, RecordStats, Season, Snapshot } from "@/data/types";

export const SEASON_FIELDS = [
  "rating_sum",
  "minutes",
  "starts",
  "subs",
  "rated",
  "goals",
  "assists",
  "conceded",
  "pens_taken",
  "pens_scored",
  "motm",
  "red",
  "yellow",
  "clean_sheets",
] as const satisfies readonly (keyof Season)[];

export const RECORD_FIELDS = [
  "pas_att",
  "pas_cmp",
  "tck_att",
  "tck_won",
  "hdr_att",
  "hdr_won",
  "drb",
  "fouls",
  "fouls_won",
  "shots",
  "sot",
  "distance10",
  "offsides",
  "saves_tipped",
  "op_crs_cmp",
  "kp",
  "tck_key",
  "hdr_key",
  "int",
  "ccc",
  "blocks",
  "poss_lost",
  "poss_won",
  "xg100",
  "xa100",
  "clr",
  "fk",
  "goals_out",
  "op_crs_att",
  "shots_out",
  "xgp100",
  "sprints",
  "pr_passes",
  "pres_att",
  "pres_cmp",
  "op_kp",
  "npxg100",
  "crs_att",
  "crs_cmp",
  "shots_blk",
  "hdr_lost",
] as const satisfies readonly (keyof RecordStats)[];

export const CURRENT_SEASON = "season";
export const RECENT_GAMES = [30, 50] as const;

export type Period = typeof CURRENT_SEASON | `games:${number}` | `year:${number}`;

export const gamesPeriod = (games: number): Period => `games:${games}`;
export const yearPeriod = (year: number): Period => `year:${year}`;

const PERIOD = /^(games|year):(\d{1,4})$/;

export function isPeriod(value: unknown): value is Period {
  return value === CURRENT_SEASON || (typeof value === "string" && PERIOD.test(value));
}

export function readPeriod(period: Period): { kind: "season" } | { kind: "games" | "year"; n: number } {
  const m = PERIOD.exec(period);
  return m ? { kind: m[1] as "games" | "year", n: Number(m[2]) } : { kind: "season" };
}

type Totals = { season: number[]; record: number[] };

const seasonValues = (s: Season | null): number[] => SEASON_FIELDS.map((k) => s?.[k] ?? 0);
const recordValues = (r: RecordStats): number[] => RECORD_FIELDS.map((k) => r[k] ?? 0);

const toSeason = (values: readonly number[]): Season =>
  Object.fromEntries(SEASON_FIELDS.map((k, j) => [k, values[j] ?? 0])) as unknown as Season;
const toRecord = (values: readonly number[]): RecordStats =>
  Object.fromEntries(RECORD_FIELDS.map((k, j) => [k, values[j] ?? 0])) as unknown as RecordStats;

const gamesOf = (season: readonly number[]) => (season[2] ?? 0) + (season[3] ?? 0);

function addScaled(into: Totals, from: Totals, share: number) {
  for (let j = 0; j < into.season.length; j++) into.season[j] += Math.round((from.season[j] ?? 0) * share);
  for (let j = 0; j < into.record.length; j++) into.record[j] += Math.round((from.record[j] ?? 0) * share);
}

function lastGames(r: PlayerRecord, games: number): PlayerRecord {
  const current: Totals = { season: seasonValues(r.season), record: recordValues(r.record) };
  const sum: Totals = { season: SEASON_FIELDS.map(() => 0), record: RECORD_FIELDS.map(() => 0) };
  let played = gamesOf(current.season);
  if (played >= games) {
    addScaled(sum, current, played > 0 ? games / played : 1);
    return { ...r, season: toSeason(sum.season), record: toRecord(sum.record) };
  }
  addScaled(sum, current, 1);
  let partial = r.partial_detail;
  let usedPast = false;
  for (const past of [...(r.past_seasons ?? [])].sort((a, b) => b.year - a.year)) {
    const need = games - played;
    if (need <= 0) break;
    const had = gamesOf(past.season);
    if (had <= 0) continue;
    const share = Math.min(1, need / had);
    addScaled(sum, past, share);
    played += had * share;
    partial ||= past.partial;
    usedPast = true;
  }
  if (!usedPast) return r;
  return {
    ...r,
    season: toSeason(sum.season),
    record: toRecord(sum.record),
    keeper: null,
    partial_detail: partial,
  };
}

const EMPTY_RECORD = toRecord([]);

function pastYear(r: PlayerRecord, year: number): PlayerRecord {
  const past: PastSeason | undefined = r.past_seasons?.find((p) => p.year === year);
  if (!past) return { ...r, season: null, record: EMPTY_RECORD, keeper: null };
  return {
    ...r,
    season: toSeason(past.season),
    record: toRecord(past.record),
    keeper: null,
    partial_detail: past.partial,
  };
}

export function applyPeriod(snapshot: Snapshot, period: Period): Snapshot {
  const read = readPeriod(period);
  if (read.kind === "season") return snapshot;
  const pick =
    read.kind === "games" ? (r: PlayerRecord) => lastGames(r, read.n) : (r: PlayerRecord) => pastYear(r, read.n);
  return { ...snapshot, players: snapshot.players.map(pick) };
}

export function pastYears(snapshot: Pick<Snapshot, "players" | "date">): number[] {
  const thisYear = snapshot.date ? Number(snapshot.date.slice(0, 4)) : Number.POSITIVE_INFINITY;
  const years = new Set<number>();
  for (const r of snapshot.players)
    for (const past of r.past_seasons ?? []) if (past.year < thisYear) years.add(past.year);
  return [...years].sort((a, b) => b - a);
}
