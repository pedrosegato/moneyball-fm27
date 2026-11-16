import type { PlayerRecord, RecordStats, Season } from "@/data/types";

export const NONE = 0;
export const BASIC = 1;
export const CORE = 2;
export const FULL = 3;
export type Detail = typeof NONE | typeof BASIC | typeof CORE | typeof FULL;

const GK_MIN_RATING = 15;
const MIN_FULL_DIST = 8.5;
const NO_SAVES_MINUTES = 270;

export interface RecordContext {
  readonly r: PlayerRecord;
  readonly e: Season;
  readonly s: RecordStats;
  readonly m: number;
  readonly detail: Detail;
  readonly gk: boolean;
  readonly goalsOutKnown: boolean;
  readonly cleanSheets: number;
  readonly saveData: boolean;
  readonly saves: number;
  readonly savesConceded: number;
  readonly savesMinutes: number;
  readonly xgPrevented: number;
}

const NO_SEASON: Season = Object.freeze({
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
});

export function isKeeper(pos: readonly number[]): boolean {
  return pos.length > 0 && pos[0] >= GK_MIN_RATING && Math.max(...pos) === pos[0];
}

function detailOf(r: PlayerRecord, s: RecordStats, m: number, gk: boolean): Detail {
  if (!(s.pas_att || s.distance10 || s.sprints || s.op_crs_cmp || s.poss_lost || s.xg100)) return BASIC;
  const thin = !gk && ((s.distance10 / 10) * 90) / m < MIN_FULL_DIST;
  if (r.partial_detail && s.pas_att && (thin || !(s.distance10 || s.sprints))) return CORE;
  return FULL;
}

function build(r: PlayerRecord): RecordContext {
  const s = r.record;
  const gk = isKeeper(r.pos);
  const e = r.season?.minutes ? r.season : NO_SEASON;
  const m = e.minutes;
  const k = r.keeper;
  const saves = k ? k.saves : s.op_crs_cmp;
  const savesMinutes = k ? k.minutes : m;
  return {
    r,
    e,
    s,
    m,
    gk,
    detail: m ? detailOf(r, s, m, gk) : NONE,
    goalsOutKnown: !r.partial_detail,
    cleanSheets: k ? k.clean_sheets : e.clean_sheets,
    saveData: savesMinutes > 0 && !(!saves && m >= NO_SAVES_MINUTES),
    saves,
    savesConceded: k ? k.conceded : e.conceded,
    savesMinutes,
    xgPrevented: (k ? k.xgp100 : s.xgp100) / 100,
  };
}

let lastRecord: PlayerRecord | undefined;
let lastContext: RecordContext | undefined;

export function contextOf(r: PlayerRecord): RecordContext {
  if (r !== lastRecord || !lastContext) {
    lastContext = build(r);
    lastRecord = r;
  }
  return lastContext;
}
