import { dateRangeFilter, rangeFilter } from "./filterSpecs";

describe("rangeFilter", () => {
  const bounds = { lo: 16, hi: 41, count: 30 };

  it("leaves a bound open when it sits at the edge of the data", () => {
    expect(rangeFilter("age", { min: 16, max: 23 }, bounds)).toEqual({ col: "age", kind: "range", max: 23 });
    expect(rangeFilter("age", { min: 20, max: 41 }, bounds)).toEqual({ col: "age", kind: "range", min: 20 });
    expect(rangeFilter("age", { min: 20, max: 23 }, bounds)).toEqual({ col: "age", kind: "range", min: 20, max: 23 });
  });

  it("is no filter at all over the whole range", () => {
    expect(rangeFilter("age", { min: 16, max: 41 }, bounds)).toBeNull();
  });
});

describe("dateRangeFilter", () => {
  it("leaves a date open at the edge of the data", () => {
    const bounds = { lo: "2026-06-30", hi: "2031-06-30" };
    expect(dateRangeFilter("contract_end", { min: "2026-06-30", max: "2027-06-30" }, bounds)).toEqual({
      col: "contract_end",
      kind: "dateRange",
      to: "2027-06-30",
    });
    expect(dateRangeFilter("contract_end", { min: "2026-06-30", max: "2031-06-30" }, bounds)).toBeNull();
  });
});
