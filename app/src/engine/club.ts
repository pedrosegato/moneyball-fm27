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

export const FULL_SAMPLE_MINUTES = 1800;

export interface SampleSizes {
  minutes: Float64Array;
  full: Float64Array;
}

export function sampleSizes(records: readonly PlayerRecord[]): SampleSizes {
  const minutes = Float64Array.from(records, minutesOf);
  return { minutes, full: new Float64Array(records.length).fill(FULL_SAMPLE_MINUTES) };
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
