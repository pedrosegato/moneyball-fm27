import { renderHook } from "@testing-library/react";
import { indicesOf, scoutRows, useStableRows } from "./rows";

const list = (a: ArrayLike<number>) => Array.from(a);

describe("scoutRows", () => {
  const candidates = Uint32Array.of(4, 0, 2, 3);

  it("keeps the candidates' order, dropping what the filters leave out", () => {
    const visible = Uint8Array.of(1, 1, 1, 0, 1);
    expect(list(scoutRows(candidates, null))).toEqual([4, 0, 2, 3]);
    expect(list(scoutRows(candidates, visible))).toEqual([4, 0, 2]);
  });
});

describe("indicesOf", () => {
  it("turns Moneyball's uids into row indices, in its order, skipping a uid the snapshot lost", () => {
    const uids = Uint32Array.of(70, 71, 72, 73);
    expect(list(indicesOf(Uint32Array.of(73, 70, 99, 72), uids))).toEqual([3, 0, 2]);
  });
});

describe("useStableRows", () => {
  it("hands back the previous rows while the new ones hold the same players in the same order", () => {
    const first = Uint32Array.of(1, 2, 3);
    const { result, rerender } = renderHook(({ rows }) => useStableRows(rows), { initialProps: { rows: first } });
    rerender({ rows: Uint32Array.of(1, 2, 3) });
    expect(result.current).toBe(first);
    const reordered = Uint32Array.of(2, 1, 3);
    rerender({ rows: reordered });
    expect(result.current).toBe(reordered);
  });
});
