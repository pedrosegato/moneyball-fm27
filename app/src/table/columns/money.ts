import {
  formatMoney,
  formatWage,
  type Money,
  moneyPrefixWidth,
  perWagePeriod,
  wageInGame,
  wagePeriodSuffix,
  wageScale,
} from "@/lib/money";
import { tableText } from "../lib/tableText";
import { type ColumnCopy, number } from "./factories";
import { COLUMN_GROUP, PLAYER_COLUMN } from "./ids";
import type { ExportField, NumberColumn } from "./types";

const exported = (values: ArrayLike<number>, toGame: (v: number) => number) => (i: number) =>
  Number.isNaN(values[i]) ? null : toGame(values[i]);

const moneyHeader = (header: string, money: Money) => tableText("csv.money", { header, currency: money.symbol });

export const moneyExport = (header: string, values: ArrayLike<number>, money: Money): ExportField => ({
  header: moneyHeader(header, money),
  get: exported(values, (pounds) => Math.round(pounds * money.rate)),
});

export const wageExport = (
  header: string,
  values: ArrayLike<number>,
  money: Money,
  { headerNamesPeriod = false } = {},
): ExportField => ({
  header: headerNamesPeriod
    ? moneyHeader(header, money)
    : tableText("csv.wage", { header, currency: money.symbol, period: wagePeriodSuffix(money) }),
  get: exported(values, (weeklyPounds) => wageInGame(weeklyPounds, money)),
});

interface MoneySpec extends ColumnCopy {
  width: number;
  value: ArrayLike<number>;
}

export function moneyColumn({ width, ...spec }: MoneySpec, money: Money, pool?: ArrayLike<number>): NumberColumn {
  const shown = { ...spec, width: width + moneyPrefixWidth(money), format: (v: number) => formatMoney(v, money) };
  const column = number(shown, COLUMN_GROUP.contract, pool);
  return { ...column, moneyScale: money.rate, exports: [moneyExport(spec.abbr, column.value, money)] };
}

export function wageColumn(value: ArrayLike<number>, money: Money): NumberColumn {
  const per = perWagePeriod(money);
  const shown = {
    id: PLAYER_COLUMN.wage,
    abbr: tableText("column.wage.abbr"),
    label: tableText("column.wage.label", { per }),
    description: tableText("column.wage.description", { per }),
    width: 80 + moneyPrefixWidth(money),
    value,
    format: (v: number) => formatWage(v, money),
  };
  const column = number(shown, COLUMN_GROUP.contract);
  return { ...column, moneyScale: wageScale(money), exports: [wageExport(shown.abbr, column.value, money)] };
}
