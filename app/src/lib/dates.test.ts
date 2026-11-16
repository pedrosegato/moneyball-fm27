import { dateBounds, isIsoDate } from "./dates";

describe("isIsoDate", () => {
  it("takes only a whole ISO day", () => {
    expect(isIsoDate("2027-06-30")).toBe(true);
    expect(isIsoDate("2027-6-30")).toBe(false);
    expect(isIsoDate("30/06/2027")).toBe(false);
    expect(isIsoDate(20270630)).toBe(false);
  });
});

describe("dateBounds", () => {
  it("finds the first and last day, skipping missing dates and times", () => {
    expect(dateBounds(["2027-06-30", null, "2026-01-15T00:00:00", "2029-12-31"])).toEqual({
      lo: "2026-01-15",
      hi: "2029-12-31",
    });
  });

  it("has no bounds without a date", () => {
    expect(dateBounds([null, null])).toBeNull();
    expect(dateBounds([])).toBeNull();
  });
});
