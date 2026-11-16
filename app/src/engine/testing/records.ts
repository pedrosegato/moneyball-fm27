import type { PlayerRecord, RecordStats, Season, Snapshot } from "@/data/types";

const RECORD_ZERO: RecordStats = {
  pas_att: 0,
  pas_cmp: 0,
  tck_att: 0,
  tck_won: 0,
  hdr_att: 0,
  hdr_won: 0,
  drb: 0,
  fouls: 0,
  fouls_won: 0,
  shots: 0,
  sot: 0,
  distance10: 0,
  offsides: 0,
  saves_tipped: 0,
  op_crs_cmp: 0,
  kp: 0,
  tck_key: 0,
  hdr_key: 0,
  int: 0,
  ccc: 0,
  blocks: 0,
  poss_lost: 0,
  poss_won: 0,
  xg100: 0,
  xa100: 0,
  clr: 0,
  fk: 0,
  goals_out: 0,
  op_crs_att: 0,
  shots_out: 0,
  xgp100: 0,
  sprints: 0,
  pr_passes: 0,
  pres_att: 0,
  pres_cmp: 0,
  op_kp: 0,
  npxg100: 0,
  crs_att: 0,
  crs_cmp: 0,
  shots_blk: 0,
  hdr_lost: 0,
};

const SEASON_ZERO: Season = {
  rating_sum: 0,
  minutes: 0,
  starts: 0,
  subs: 0,
  rated: 0,
  goals: 0,
  assists: 0,
  conceded: 0,
  pens_taken: 0,
  pens_scored: 0,
  motm: 0,
  red: 0,
  yellow: 0,
  clean_sheets: 0,
};

export interface RecordParts extends Partial<Omit<PlayerRecord, "season">> {
  minutes?: number;
  season?: Partial<Season>;
}

let nextUid = 1;

export function playerRecord({ minutes = 1000, season, ...rest }: RecordParts = {}): PlayerRecord {
  return {
    uid: nextUid++,
    name: "Teste",
    pos: [],
    position: "ST (C)",
    age: 25,
    dob: null,
    nat: null,
    nation: null,
    club: "Outro",
    club_uid: 1,
    owner: null,
    owner_uid: null,
    division: "Premier League",
    team: "Senior Team",
    owner_team: null,
    wage: 1000,
    contract_end: "2030-06-30",
    value: 1_000_000,
    height: 180,
    foot: "Right",
    ca: 100,
    pa: 120,
    attrs: [],
    personality: [],
    record: { ...RECORD_ZERO },
    keeper: null,
    partial_detail: false,
    season: minutes ? { ...SEASON_ZERO, minutes, rated: 10, rating_sum: 700, ...season } : null,
    ...rest,
  };
}

export function snapshotOf(players: PlayerRecord[], parts: Partial<Omit<Snapshot, "players">> = {}): Snapshot {
  return { build: "test", scope: "competitive", date: "2026-11-11", my_clubs: [], seconds: 1, players, ...parts };
}

export function playedRecord(per90: number, minutes: number): RecordStats {
  const total = (per90 * minutes) / 90;
  return Object.fromEntries(Object.keys(RECORD_ZERO).map((key) => [key, total])) as unknown as RecordStats;
}
