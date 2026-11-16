import { dataBounds, histogram } from "./histogram";

describe("dataBounds", () => {
  it("ignores NaN", () => {
    expect(dataBounds(new Float64Array([NaN, 3, -1, NaN, 7]))).toEqual({ lo: -1, hi: 7, count: 3 });
  });

  it("is null when no value is set", () => {
    expect(dataBounds(new Float64Array([NaN, NaN]))).toBeNull();
    expect(dataBounds(new Float64Array([]))).toBeNull();
  });
});

describe("histogram", () => {
  it("bins every non-NaN value, the maximum in the last bin", () => {
    const values = new Float64Array([0, 0.5, 1, 1.5, 2, NaN, 23.9, 24]);
    const bins = histogram(values, 0, 24, 24);
    expect(bins).toHaveLength(24);
    expect(bins.reduce((a, b) => a + b, 0)).toBe(7);
    expect(bins[0]).toBe(2);
    expect(bins[1]).toBe(2);
    expect(bins[2]).toBe(1);
    expect(bins[23]).toBe(2);
  });

  it("puts everything in one bin when all values are equal", () => {
    const bins = histogram(new Float64Array([5, 5, 5]), 5, 5, 24);
    expect(bins[0]).toBe(3);
    expect(bins.reduce((a, b) => a + b, 0)).toBe(3);
  });
});
