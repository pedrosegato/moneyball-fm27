import type { POS_NAMES } from "@/engine/positions";

export const SCOPES = ["competitive", "league", "all", "cups", "continental"] as const;
export type Scope = (typeof SCOPES)[number];

export interface Season {
  rating_sum: number;
  minutes: number;
  starts: number;
  subs: number;
  rated: number;
  goals: number;
  assists: number;
  conceded: number;
  pens_taken: number;
  pens_scored: number;
  motm: number;
  red: number;
  yellow: number;
  clean_sheets: number;
}

export interface RecordStats {
  pas_att: number;
  pas_cmp: number;
  tck_att: number;
  tck_won: number;
  hdr_att: number;
  hdr_won: number;
  drb: number;
  fouls: number;
  fouls_won: number;
  shots: number;
  sot: number;
  distance10: number;
  offsides: number;
  saves_tipped: number;
  op_crs_cmp: number;
  kp: number;
  tck_key: number;
  hdr_key: number;
  int: number;
  ccc: number;
  blocks: number;
  poss_lost: number;
  poss_won: number;
  xg100: number;
  xa100: number;
  clr: number;
  fk: number;
  goals_out: number;
  op_crs_att: number;
  shots_out: number;
  xgp100: number;
  sprints: number;
  pr_passes: number;
  pres_att: number;
  pres_cmp: number;
  op_kp: number;
  npxg100: number;
  crs_att: number;
  crs_cmp: number;
  shots_blk: number;
  hdr_lost: number;
}

export interface Keeper {
  saves: number;
  conceded: number;
  minutes: number;
  xgp100: number;
  clean_sheets: number;
}

export interface PlayerRecord {
  uid: number;
  name: string;
  pos: number[];
  position: string;
  age: number | null;
  dob: string | null;
  nat: string | null;
  nation: string | null;
  club: string | null;
  club_uid: number | null;
  owner: string | null;
  owner_uid: number | null;
  division: string | null;
  competition_reputation?: number | null;
  team: string | null;
  owner_team: string | null;
  wage: number | null;
  contract_end: string | null;
  squad_number?: number | null;
  value: number;
  height: number;
  foot: string;
  ca: number;
  pa: number;
  attrs: number[];
  personality: number[];
  season: Season | null;
  record: RecordStats;
  keeper: Keeper | null;
  partial_detail: boolean;
  past_seasons?: PastSeason[];
}

export interface PastSeason {
  year: number;
  season: number[];
  record: number[];
  partial: boolean;
}

export interface ClubRef {
  name: string;
  uid: number | null;
}

export type WagePeriod = "week" | "month" | "year";

export interface GameCurrency {
  code: string;
  symbol: string;
  name: string;
}

export interface GameMoney {
  currency: GameCurrency;
  rate: number;
  wage_period: WagePeriod;
}

export type TacticSide = "L" | "C" | "R";

export interface TacticSlot {
  position: (typeof POS_NAMES)[number];
  side: TacticSide;
  roleId: string;
}

export interface LineupSlot {
  ip: TacticSlot;
  oop: TacticSlot;
  playerId: number | null;
}

export interface Tactic {
  name: string;
  style: string | null;
  slots: LineupSlot[];
  subs: number[];
}

export interface Snapshot {
  build: string;
  scope: Scope;
  date: string | null;
  my_clubs: ClubRef[];
  seconds: number;
  money?: GameMoney | null;
  tactic?: Tactic | null;
  players: PlayerRecord[];
}

export interface GameStatus {
  ok: boolean;
  pid?: number;
  build?: string;
  build_known?: boolean;
  game?: string;
  date?: string;
  error?: string;
  busy?: boolean;
  money?: GameMoney;
}

export interface ClubFinances {
  club_uid: number;
  transfer_budget: number | null;
  wage_budget_weekly: number | null;
  verified: boolean;
}

export interface LoadProgress {
  phase: "scan" | "read";
  done?: number;
  total?: number;
}
