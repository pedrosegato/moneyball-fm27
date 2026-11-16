import {
  formatClock,
  formatDate,
  formatDayMonth,
  formatDecimal,
  formatRounded,
  formatSigned,
  formatStat,
  orEmpty,
  parseDecimal,
} from "./format";

describe("parseDecimal", () => {
  it("reads pt-BR decimals and thousands", () => {
    expect(parseDecimal("0,45")).toBe(0.45);
    expect(parseDecimal("1.234,5")).toBe(1234.5);
    expect(parseDecimal(" 2.140 ")).toBe(2140);
    expect(parseDecimal("-0,2")).toBe(-0.2);
  });

  it("accepts a dot as the decimal mark when the number cannot be a thousands group", () => {
    expect(parseDecimal("0.45")).toBe(0.45);
    expect(parseDecimal("12.5")).toBe(12.5);
  });

  it("returns NaN for anything that is not a number", () => {
    expect(parseDecimal("")).toBeNaN();
    expect(parseDecimal("abc")).toBeNaN();
    expect(parseDecimal("1,2,3")).toBeNaN();
  });
});

describe("formatDecimal", () => {
  it("uses the pt-BR marks and trims trailing zeros", () => {
    expect(formatDecimal(0.4123, 2)).toBe("0,41");
    expect(formatDecimal(0.5, 3)).toBe("0,5");
    expect(formatDecimal(2140, 0)).toBe("2.140");
  });
});

describe("formatStat", () => {
  it("formats each unit at its own precision", () => {
    expect(formatStat(0.4123, "per90")).toBe("0,41");
    expect(formatStat(1.2, "per90")).toBe("1,20");
    expect(formatStat(2140, "count")).toBe("2.140");
    expect(formatStat(12.34, "count")).toBe("12,3");
    expect(formatStat(31.2, "pct")).toBe("31%");
    expect(formatStat(3.123, "ratio")).toBe("3,12");
    expect(formatStat(135.5, "ratio")).toBe("136");
    expect(formatStat(11.44, "km")).toBe("11,4");
  });
});

describe("game dates", () => {
  it("formats an ISO date as day/month, without a timezone shift", () => {
    expect(formatDayMonth("2026-10-30")).toBe("30/10");
    expect(formatDayMonth("2027-01-02")).toBe("02/01");
    expect(formatDate("2027-01-02")).toBe("02/01/2027");
  });

  it("returns what it cannot read unchanged", () => {
    expect(formatDayMonth("ontem")).toBe("ontem");
  });

  it("writes a moment as the local hour and minute, 24-hour", () => {
    expect(formatClock(new Date(2026, 10, 12, 9, 5).getTime())).toBe("09:05");
    expect(formatClock(new Date(2026, 10, 12, 21, 47).getTime())).toBe("21:47");
  });
});

describe("formatRounded", () => {
  it("rounds to a whole number before writing it with pt-BR marks", () => {
    expect(formatRounded(87.5)).toBe("88");
    expect(formatRounded(1499.6)).toBe("1.500");
  });
});

describe("formatSigned", () => {
  it("puts a sign on every number but zero", () => {
    expect(formatSigned(12, 0)).toBe("+12");
    expect(formatSigned(-3.25, 1)).toBe("-3,3");
    expect(formatSigned(0, 0)).toBe("0");
    expect(formatSigned(1.5, 1)).toBe("+1,5");
  });
});

describe("orEmpty", () => {
  it("writes a dash for a missing number and formats the rest", () => {
    expect(orEmpty(null, String)).toBe("—");
    expect(orEmpty(undefined, String)).toBe("—");
    expect(orEmpty(NaN, String)).toBe("—");
    expect(orEmpty(0, (v) => `${v} cm`)).toBe("0 cm");
  });
});
