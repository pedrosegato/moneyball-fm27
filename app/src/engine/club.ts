import type { PlayerRecord } from "@/data/types";
import { leagueKey } from "./league";

export const minutesOf = (r: PlayerRecord): number => r.season?.minutes ?? 0;

export const poolFlags = (records: readonly PlayerRecord[], poolMinutes: number): Uint8Array =>
  Uint8Array.from(records, (r) => (minutesOf(r) >= poolMinutes ? 1 : 0));

const VALUE_UNSET = new Set([0, 300_000_000, 0xffff_ffff]);

export function marketValue(r: PlayerRecord): number {
  const v = r.value;
  return v == null || VALUE_UNSET.has(v) || !(v > 0) ? NaN : v;
}

export const heightOf = (r: PlayerRecord): number => (r.height ? r.height : NaN);

export function seniorFlags(records: readonly PlayerRecord[]): Uint8Array {
  const named = records.some((r) => r.team);
  return Uint8Array.from(records, (r) => (!named || r.team === "Senior Team" ? 1 : 0));
}

export const playsFor = (r: PlayerRecord, clubUid: number | null): boolean =>
  clubUid !== null && r.club_uid === clubUid;

export const belongsTo = (r: PlayerRecord, clubUid: number | null): boolean =>
  clubUid !== null && (r.club_uid === clubUid || r.owner_uid === clubUid);

export const contractedTo = (r: PlayerRecord, clubUid: number | null): boolean =>
  clubUid !== null && ((r.club_uid === clubUid && !r.owner) || r.owner_uid === clubUid);

export const FULL_SAMPLE_FLOOR_MINUTES = 900;
export const FULL_SAMPLE_CEILING_MINUTES = 1800;
export const FULL_SAMPLE_SHARE_OF_REGULARS = 0.8;
export const MIN_LEAGUE_REGULARS = 20;
const REGULARS_QUANTILE = 0.9;

export interface SampleSizes {
  minutes: Float64Array;
  full: Float64Array;
}

export function sampleSizes(records: readonly PlayerRecord[]): SampleSizes {
  const senior = seniorFlags(records);
  const minutes = Float64Array.from(records, minutesOf);
  const keys = records.map((r) => leagueKey(r.division));
  const byLeague = new Map<string, number[]>();
  records.forEach((_, i) => {
    if (!keys[i] || !senior[i] || minutes[i] <= 0) return;
    const list = byLeague.get(keys[i]);
    if (list) list.push(minutes[i]);
    else byLeague.set(keys[i], [minutes[i]]);
  });
  const fullByLeague = new Map<string, number>();
  for (const [key, list] of byLeague) {
    if (list.length < MIN_LEAGUE_REGULARS) continue;
    list.sort((a, b) => a - b);
    const regulars = list[Math.floor(REGULARS_QUANTILE * (list.length - 1))];
    fullByLeague.set(
      key,
      Math.min(
        FULL_SAMPLE_CEILING_MINUTES,
        Math.max(FULL_SAMPLE_FLOOR_MINUTES, FULL_SAMPLE_SHARE_OF_REGULARS * regulars),
      ),
    );
  }
  const full = Float64Array.from(keys, (key) => fullByLeague.get(key) ?? FULL_SAMPLE_CEILING_MINUTES);
  return { minutes, full };
}

export function clubLeague(records: readonly PlayerRecord[], clubUid: number | null): string | null {
  if (clubUid === null) return null;
  const counts = new Map<string, number>();
  for (const r of records) {
    if (r.club_uid !== clubUid || r.owner) continue;
    const key = leagueKey(r.division);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: string | null = null;
  let most = 0;
  for (const [key, n] of counts) {
    if (n > most) {
      best = key;
      most = n;
    }
  }
  return best;
}

const yearMonthDay = (iso: string | null): [number, number, number] | null => {
  const m = /^(\d+)-(\d+)(?:-(\d+))?/.exec(iso ?? "");
  return m ? [Number(m[1]), Number(m[2]), Number(m[3] ?? 1)] : null;
};

export function monthsLeft(r: PlayerRecord, date: string | null): number {
  const end = yearMonthDay(r.contract_end);
  const now = yearMonthDay(date);
  if (!end || !now) return NaN;
  const months = (end[0] - now[0]) * 12 + (end[1] - now[1]);
  return months === 0 && end[2] < now[2] ? -1 : months;
}

export const hasFoot = (r: PlayerRecord, foot: string): boolean =>
  !foot || (r.foot ?? "").toLowerCase().startsWith(foot.toLowerCase());
