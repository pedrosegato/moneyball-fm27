import type { GameMoney } from "@/data/types";
import {
  currencyPlural,
  formatMoney,
  formatWage,
  type Money,
  moneyExample,
  moneyOf,
  moneyPrefixWidth,
  POUNDS,
  parseMoney,
  parseWage,
  perWagePeriod,
  rateText,
  wageAdjective,
  wageInGame,
  wagePeriodSuffix,
  wageScale,
} from "./money";

const GAME_EUROS: GameMoney = {
  currency: { code: "EUR", symbol: "€", name: "Euro" },
  rate: 1.1641011238098145,
  wage_period: "month",
};
const euros = moneyOf(GAME_EUROS)!;
const roundEuros: Money = { ...euros, rate: 1.2 };
const reais: Money = { code: "BRL", symbol: "R$", name: "Real brasileiro", rate: 7.5, wagePeriod: "week" };
const kroner: Money = { code: "DKK", symbol: "kr.", name: "Coroa dinamarquesa", rate: 8.7, wagePeriod: "year" };

describe("formatMoney", () => {
  it("writes pounds as the game keeps them", () => {
    expect(formatMoney(6_400_000, POUNDS)).toBe("£6,4M");
    expect(formatMoney(18_000, POUNDS)).toBe("£18 mil");
    expect(formatMoney(-3_500_000, POUNDS)).toBe("−£3,5M");
    expect(formatMoney(24_000_000, POUNDS)).toBe("£24,0M");
    expect(formatMoney(950, POUNDS)).toBe("£950");
    expect(formatMoney(0, POUNDS)).toBe("£0");
  });

  it("moves up a unit where rounding would print four digits", () => {
    expect(formatMoney(999_600, POUNDS)).toBe("£1,0M");
    expect(formatMoney(999.7, POUNDS)).toBe("£1 mil");
    expect(formatMoney(999_960_000, POUNDS)).toBe("£1,0 bi");
  });

  it("converts at the game's rate and writes the game's symbol, spaced when it has more than one letter", () => {
    expect(formatMoney(3_576_486, euros)).toBe("€4,2M");
    expect(formatMoney(10_000_000, reais)).toBe("R$ 75,0M");
    expect(formatMoney(18_000, reais)).toBe("R$ 135 mil");
    expect(formatMoney(-1_000_000, roundEuros)).toBe("−€1,2M");
    expect(formatMoney(1_000_000, kroner)).toBe("kr. 8,7M");
    expect(formatMoney(50_000_000, { ...reais, symbol: "₩", rate: 1837.82 })).toBe("₩91,9 bi");
  });
});

describe("formatWage", () => {
  it("shows a weekly wage the way FM shows it per month: rounded after truncating to whole pounds", () => {
    expect(wageInGame(7_294, euros)).toBe(36_794);
    expect(wageInGame(157_249, euros)).toBe(793_232);
    expect(wageInGame(950, euros)).toBe(4_791);
    expect(wageInGame(3, { ...POUNDS, wagePeriod: "month" })).toBe(13);
    expect(formatWage(157_249, euros)).toBe("€793 mil");
    expect(formatWage(7_294, euros)).toBe("€37 mil");
  });

  it("keeps a weekly wage weekly and multiplies by 52 for a yearly one", () => {
    expect(formatWage(7_294, POUNDS)).toBe("£7 mil");
    expect(wageInGame(1_000, kroner)).toBe(452_400);
    expect(formatWage(-2_000, reais)).toBe("−R$ 15 mil");
  });
});

describe("parseMoney", () => {
  it("reads an amount in the game's currency back into pounds", () => {
    expect(parseMoney("€12,0M", roundEuros)).toBe(10_000_000);
    expect(parseMoney("12M", roundEuros)).toBe(10_000_000);
    expect(parseMoney("eur 12M", roundEuros)).toBe(10_000_000);
    expect(parseMoney("R$ 135 mil", reais)).toBe(18_000);
    expect(parseMoney("kr. 8,7M", kroner)).toBe(1_000_000);
    expect(parseMoney("1,2 bi", roundEuros)).toBe(1_000_000_000);
  });

  it("reads what formatMoney writes", () => {
    for (const money of [POUNDS, reais, roundEuros]) {
      for (const pounds of [1_000_000, 10_000_000, 20_000]) {
        expect(parseMoney(formatMoney(pounds, money), money), `${money.code} ${pounds}`).toBe(pounds);
      }
    }
  });

  it("reads the compact text, plain numbers, pt-BR thousands and the habitual 18k and decimal dot", () => {
    expect(parseMoney("£2,5M", POUNDS)).toBe(2_500_000);
    expect(parseMoney("2,5 m", POUNDS)).toBe(2_500_000);
    expect(parseMoney("£18 mil", POUNDS)).toBe(18_000);
    expect(parseMoney("18k", POUNDS)).toBe(18_000);
    expect(parseMoney("£ 1.234,5 mil", POUNDS)).toBe(1_234_500);
    expect(parseMoney("2.500.000", POUNDS)).toBe(2_500_000);
    expect(parseMoney("450000", POUNDS)).toBe(450_000);
    expect(parseMoney("2.5M", POUNDS)).toBe(2_500_000);
    expect(parseMoney("0", POUNDS)).toBe(0);
  });

  it("takes a typed pound sign as pounds and refuses another currency's symbol", () => {
    expect(parseMoney("£2M", roundEuros)).toBe(2_000_000);
    expect(parseMoney("€1,2M", reais)).toBeNaN();
  });

  it("keeps whole pounds and refuses what is not an amount", () => {
    expect(parseMoney("R$ 10", reais)).toBe(1);
    expect(parseMoney("abc", reais)).toBeNaN();
    expect(parseMoney("-5M", reais)).toBeNaN();
    expect(parseMoney("", reais)).toBeNaN();
    expect(parseMoney("muito", reais)).toBeNaN();
    expect(parseMoney("2,5 bilhões", reais)).toBeNaN();
  });
});

describe("parseWage", () => {
  it("reads a wage in the game's period and currency back into weekly pounds", () => {
    expect(parseWage("€52 mil", roundEuros)).toBe(10_000);
    expect(parseWage("52 mil", roundEuros)).toBe(10_000);
    expect(parseWage("£52 mil", { ...roundEuros, rate: 2 })).toBe(12_000);
    expect(parseWage("£7 mil", POUNDS)).toBe(7_000);
    expect(parseWage("kr. 452,4 mil", kroner)).toBe(1_000);
    expect(parseWage("x", euros)).toBeNaN();
  });

  it("reads what formatWage writes", () => {
    for (const weekly of [10_000, 2_500, 50_000]) {
      expect(parseWage(formatWage(weekly, roundEuros), roundEuros)).toBe(weekly);
    }
  });
});

describe("moneyOf", () => {
  it("takes the game's currency, rate and wage period, with the currency's pt-BR name", () => {
    expect(euros).toEqual({
      code: "EUR",
      symbol: "€",
      name: "Euro",
      rate: 1.1641011238098145,
      wagePeriod: "month",
    });
    const real = moneyOf({ ...GAME_EUROS, currency: { code: "BRL", symbol: " R$ ", name: "Real" } });
    expect(real).toMatchObject({ code: "BRL", symbol: "R$", name: "Real brasileiro" });
  });

  it("falls back to the code for a missing symbol and to weekly wages for an unknown period", () => {
    const franc = moneyOf({
      currency: { code: "chf", symbol: "", name: "Swiss Franc" },
      rate: 1.1,
      wage_period: "fortnight" as GameMoney["wage_period"],
    });
    expect(franc).toMatchObject({ code: "CHF", symbol: "CHF", wagePeriod: "week" });
  });

  it("reads nothing when the game sent no usable money", () => {
    expect(moneyOf(null)).toBeNull();
    expect(moneyOf(undefined)).toBeNull();
    expect(moneyOf({ ...GAME_EUROS, rate: 0 })).toBeNull();
    expect(moneyOf({ ...GAME_EUROS, rate: Number.NaN })).toBeNull();
    expect(moneyOf({ ...GAME_EUROS, currency: { code: "€", symbol: "€", name: "Euro" } })).toBeNull();
  });
});

describe("wording", () => {
  it("names the wage period, the plural currency, the rate and the input example", () => {
    expect([perWagePeriod(euros), wagePeriodSuffix(euros), wageAdjective(euros)]).toEqual([
      "por mês",
      "/mês",
      "mensal",
    ]);
    expect([perWagePeriod(POUNDS), wagePeriodSuffix(POUNDS), wageAdjective(POUNDS)]).toEqual([
      "por semana",
      "/sem",
      "semanal",
    ]);
    expect(currencyPlural(euros)).toBe("euros");
    expect(currencyPlural(reais)).toBe("reais brasileiros");
    expect(rateText(euros)).toBe("£1 = €1,1641");
    expect(rateText(reais)).toBe("£1 = R$ 7,5000");
    expect(moneyExample(reais)).toBe("R$ 2,5M, R$ 18 mil ou 450000");
  });

  it("widens money columns for a longer symbol and scales wage filters to the shown period", () => {
    expect([moneyPrefixWidth(POUNDS), moneyPrefixWidth(reais), moneyPrefixWidth(kroner)]).toEqual([0, 24, 32]);
    expect(wageScale(roundEuros)).toBeCloseTo((1.2 * 52) / 12);
    expect(wageScale(POUNDS)).toBe(1);
  });
});
