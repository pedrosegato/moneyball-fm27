import type { StatUnit } from "@/engine/stats/catalog";
import { EMPTY_VALUE, LOCALE, MULTIPLIER_SIGN } from "./constants";
import { ISO_DATE } from "./dates";

const trimmed = new Map<number, Intl.NumberFormat>();
const fixed = new Map<number, Intl.NumberFormat>();
const signed = new Map<number, Intl.NumberFormat>();

function formatter(
  cache: Map<number, Intl.NumberFormat>,
  decimals: number,
  minimum: number,
  signDisplay?: Intl.NumberFormatOptions["signDisplay"],
) {
  let f = cache.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: minimum, maximumFractionDigits: decimals, signDisplay });
    cache.set(decimals, f);
  }
  return f;
}

export const capitalized = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

export function formatDecimal(value: number, decimals: number): string {
  return formatter(trimmed, decimals, 0).format(value);
}

export function formatFixed(value: number, decimals: number): string {
  return formatter(fixed, decimals, decimals).format(value);
}

export function formatCount(value: number): string {
  return formatFixed(value, 0);
}

export const formatRounded = (value: number): string => formatCount(Math.round(value));

const SCORE_MAX = 100;

export const clampScore = (value: number): number => Math.min(SCORE_MAX, Math.max(0, value));

export const formatScore = (value: number): string => formatCount(clampScore(Math.round(value)));

export const multiplierText = (text: string): string => `${MULTIPLIER_SIGN}${text}`;

export function formatSigned(value: number, decimals: number): string {
  return formatter(signed, decimals, decimals, "exceptZero").format(value);
}

export const orEmpty = (value: number | null | undefined, format: (v: number) => string): string =>
  value == null || Number.isNaN(value) ? EMPTY_VALUE : format(value);

function magnitudeDecimals(value: number): number {
  const a = Math.abs(value);
  return a >= 100 ? 0 : a >= 10 ? 1 : 2;
}

export function formatStat(value: number, unit: StatUnit): string {
  switch (unit) {
    case "per90":
    case "rating":
      return formatFixed(value, 2);
    case "pct":
      return `${formatFixed(value, 0)}%`;
    case "km":
      return formatFixed(value, 1);
    case "ratio":
      return formatFixed(value, magnitudeDecimals(value));
    case "score":
      return formatScore(value);
    case "count":
      return formatFixed(value, Number.isInteger(value) ? 0 : magnitudeDecimals(value));
  }
}

const THOUSANDS_ONLY = /^-?\d{1,3}(\.\d{3})+$/;
const PLAIN = /^-?\d+(\.\d+)?$/;

export function parseDecimal(text: string): number {
  const t = text.trim().replace(/\s/g, "");
  if (!t) return NaN;
  if (t.includes(",")) {
    const normalized = t.replace(/\./g, "").replace(",", ".");
    return PLAIN.test(normalized) ? Number(normalized) : NaN;
  }
  if (THOUSANDS_ONLY.test(t)) return Number(t.replace(/\./g, ""));
  return PLAIN.test(t) ? Number(t) : NaN;
}

export function formatDayMonth(iso: string): string {
  const m = ISO_DATE.exec(iso);
  return m ? `${m[3]}/${m[2]}` : iso;
}

export function formatDate(iso: string): string {
  const m = ISO_DATE.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function formatClock(ms: number): string {
  const at = new Date(ms);
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
}

export function formatCompactAmount(value: number, symbol: string): string {
  const a = Math.abs(value);
  const body =
    a >= 999_500 ? `${formatFixed(a / 1e6, 1)}M` : a >= 999.5 ? `${formatFixed(a / 1e3, 0)} mil` : formatFixed(a, 0);
  return `${value < 0 ? "−" : ""}${symbol}${body}`;
}

const AMOUNT_UNITS: Record<string, number> = { "": 1, k: 1e3, mil: 1e3, mi: 1e6, m: 1e6 };
const AMOUNT = /^(£|r\$|€)?\s*([\d.,]+)\s*(k|mil|mi|m)?$/i;

export function parseAmount(text: string): { symbol: string | null; amount: number } | null {
  const m = AMOUNT.exec(text.trim());
  if (!m) return null;
  const amount = parseDecimal(m[2]);
  if (!(amount >= 0)) return null;
  return { symbol: m[1] ? m[1].toUpperCase() : null, amount: amount * AMOUNT_UNITS[(m[3] ?? "").toLowerCase()] };
}
