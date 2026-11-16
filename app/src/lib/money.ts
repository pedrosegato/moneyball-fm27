import type { GameMoney, WagePeriod } from "@/data/types";
import { LOCALE } from "./constants";
import { formatFixed, parseDecimal } from "./format";

export interface Money {
  code: string;
  symbol: string;
  name: string;
  rate: number;
  wagePeriod: WagePeriod;
}

export const POUNDS: Money = Object.freeze({
  code: "GBP",
  symbol: "£",
  name: "Libra esterlina",
  rate: 1,
  wagePeriod: "week",
});

interface PeriodText {
  weeks: number;
  over: number;
  word: string;
  adjective: string;
  suffix: string;
}

const WAGE_PERIODS: Readonly<Record<WagePeriod, PeriodText>> = {
  week: { weeks: 1, over: 1, word: "semana", adjective: "semanal", suffix: "/sem" },
  month: { weeks: 52, over: 12, word: "mês", adjective: "mensal", suffix: "/mês" },
  year: { weeks: 52, over: 1, word: "ano", adjective: "anual", suffix: "/ano" },
};

const isWagePeriod = (value: unknown): value is WagePeriod => typeof value === "string" && value in WAGE_PERIODS;

const NAMES = new Intl.DisplayNames([LOCALE], { type: "currency", fallback: "none" });

export function moneyOf(game: GameMoney | null | undefined): Money | null {
  if (!game || !(game.rate > 0) || !Number.isFinite(game.rate)) return null;
  const code = game.currency.code.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return null;
  return {
    code,
    symbol: game.currency.symbol.trim() || code,
    name: NAMES.of(code) ?? game.currency.name,
    rate: game.rate,
    wagePeriod: isWagePeriod(game.wage_period) ? game.wage_period : "week",
  };
}

export const perWagePeriod = (money: Money): string => `por ${WAGE_PERIODS[money.wagePeriod].word}`;

export const wagePeriodSuffix = (money: Money): string => WAGE_PERIODS[money.wagePeriod].suffix;

export const wageAdjective = (money: Money): string => WAGE_PERIODS[money.wagePeriod].adjective;

export function currencyPlural(money: Money): string {
  const parts = new Intl.NumberFormat(LOCALE, { style: "currency", currency: money.code, currencyDisplay: "name" });
  return (
    parts
      .formatToParts(2)
      .find((p) => p.type === "currency")
      ?.value.toLowerCase() ?? money.code
  );
}

const symbolPrefix = (symbol: string) => ([...symbol].length > 1 ? `${symbol} ` : symbol);

export const rateText = (money: Money): string => `£1 = ${symbolPrefix(money.symbol)}${formatFixed(money.rate, 4)}`;

export const moneyPrefixWidth = (money: Money): number => {
  const length = [...money.symbol].length;
  return length > 1 ? 8 * (length + 1) : 0;
};

function compact(amount: number, symbol: string): string {
  const a = Math.abs(amount);
  const body =
    a >= 999_950_000
      ? `${formatFixed(a / 1e9, 1)} bi`
      : a >= 999_500
        ? `${formatFixed(a / 1e6, 1)}M`
        : a >= 999.5
          ? `${formatFixed(a / 1e3, 0)} mil`
          : formatFixed(a, 0);
  return `${amount < 0 ? "−" : ""}${symbolPrefix(symbol)}${body}`;
}

export function wageInGame(weeklyPounds: number, money: Money): number {
  const { weeks, over } = WAGE_PERIODS[money.wagePeriod];
  return Math.round(Math.trunc((weeklyPounds * weeks) / over) * money.rate);
}

export const wageScale = (money: Money): number => {
  const { weeks, over } = WAGE_PERIODS[money.wagePeriod];
  return (money.rate * weeks) / over;
};

export function formatMoney(pounds: number, money: Money): string {
  return compact(pounds * money.rate, money.symbol);
}

export function formatWage(weeklyPounds: number, money: Money): string {
  return compact(wageInGame(weeklyPounds, money), money.symbol);
}

export function moneyExample(money: Money): string {
  const prefix = symbolPrefix(money.symbol);
  return `${prefix}2,5M, ${prefix}18 mil ou 450000`;
}

const UNITS: Readonly<Record<string, number>> = { "": 1, k: 1e3, mil: 1e3, mi: 1e6, m: 1e6, bi: 1e9 };
const AMOUNT = /^([\d.,]+)\s*(k|mil|mi|m|bi)?$/i;

function amountIn(text: string): number {
  const m = AMOUNT.exec(text.trim());
  if (!m) return NaN;
  const amount = parseDecimal(m[1]);
  return amount >= 0 ? amount * UNITS[(m[2] ?? "").toLowerCase()] : NaN;
}

function after(text: string, symbol: string): string | null {
  return text.toLowerCase().startsWith(symbol.toLowerCase()) ? text.slice(symbol.length) : null;
}

function typedAmount(text: string, money: Money): { amount: number; rate: number } {
  const t = text.trim();
  for (const symbol of [money.symbol, money.code]) {
    const rest = after(t, symbol);
    if (rest !== null) return { amount: amountIn(rest), rate: money.rate };
  }
  const pounds = after(t, "£");
  return pounds === null ? { amount: amountIn(t), rate: money.rate } : { amount: amountIn(pounds), rate: 1 };
}

export function parseMoney(text: string, money: Money): number {
  const { amount, rate } = typedAmount(text, money);
  return Math.round(amount / rate);
}

export function parseWage(text: string, money: Money): number {
  const { amount, rate } = typedAmount(text, money);
  const { weeks, over } = WAGE_PERIODS[money.wagePeriod];
  return Math.round(((amount / rate) * over) / weeks);
}
