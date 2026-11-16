import { headerCheck, selectRange, toggled, toggledVisible } from "./selection";

const set = (...uids: number[]) => new Set(uids);
const order = Uint32Array.from([10, 20, 30, 40, 50]);

describe("row selection", () => {
  it("toggles one uid in and out, never touching the set it was given", () => {
    const before = set(10);
    const after = toggled(before, 20);
    expect([...after]).toEqual([10, 20]);
    expect([...toggled(after, 10)]).toEqual([20]);
    expect([...before]).toEqual([10]);
  });

  it("shift-click checks every row between the anchor and the target, in the order shown", () => {
    expect([...selectRange(set(20), order, 20, 40)].sort()).toEqual([20, 30, 40]);
    expect([...selectRange(set(40), order, 40, 10)].sort()).toEqual([10, 20, 30, 40]);
  });

  it("shift-click on a checked row unchecks the range, like the target itself", () => {
    expect([...selectRange(set(10, 20, 30, 40), order, 10, 30)]).toEqual([40]);
  });

  it("keeps rows outside the range as they were", () => {
    expect([...selectRange(set(50), order, 10, 20)].sort()).toEqual([10, 20, 50]);
  });

  it("falls back to a plain toggle when the anchor is not on show any more (a filter hid it)", () => {
    expect([...selectRange(set(), order, 99, 30)]).toEqual([30]);
    expect([...selectRange(set(30), order, null, 30)]).toEqual([]);
  });

  it("reads the header checkbox off the rows on show only", () => {
    expect(headerCheck(set(), order)).toBe("none");
    expect(headerCheck(set(99), order)).toBe("none");
    expect(headerCheck(set(10, 99), order)).toBe("some");
    expect(headerCheck(set(10, 20, 30, 40, 50), order)).toBe("all");
    expect(headerCheck(set(), new Uint32Array())).toBe("none");
  });

  it("the header checkbox selects every row on show, or clears them once all are, and keeps the hidden ones", () => {
    const all = toggledVisible(set(10, 99), order);
    expect([...all].sort((a, b) => a - b)).toEqual([10, 20, 30, 40, 50, 99]);
    expect([...toggledVisible(all, order)]).toEqual([99]);
  });
});
