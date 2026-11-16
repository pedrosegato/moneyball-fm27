import { sortRows } from "./sort";

describe("sortRows", () => {
  const key = Float64Array.of(3, NaN, 1, 3, 2, NaN);
  const rows = Uint32Array.of(0, 1, 2, 3, 4, 5);

  it("orders by the key, ties in the incoming order, missing values last either way", () => {
    expect([...sortRows(rows, key, true)]).toEqual([0, 3, 4, 2, 1, 5]);
    expect([...sortRows(rows, key, false)]).toEqual([2, 4, 0, 3, 1, 5]);
    expect([...sortRows(Uint32Array.of(5, 3, 1, 0), key, true)]).toEqual([3, 0, 5, 1]);
  });
});
