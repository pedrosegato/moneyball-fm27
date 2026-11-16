import { monthsCount } from "./months";

describe("monthsCount", () => {
  it("agrees in number with the whole months it prints", () => {
    expect(monthsCount(0)).toBe("0 meses");
    expect(monthsCount(1)).toBe("1 mês");
    expect(monthsCount(0.6)).toBe("1 mês");
    expect(monthsCount(1.5)).toBe("2 meses");
    expect(monthsCount(12)).toBe("12 meses");
    expect(monthsCount(1_500)).toBe("1.500 meses");
  });
});
