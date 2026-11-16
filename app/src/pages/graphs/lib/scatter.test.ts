import { POS_GROUPS } from "@/engine/positions";
import { STATS } from "@/engine/stats/catalog";
import { appStore } from "@/store/index";
import { axis } from "../testing/axis";
import { axesFor, betterHigh, DEFAULT_AXES, pointSet } from "./scatter";

describe("better direction", () => {
  it("does not invert a percentile again: the engine already ranks lower-is-better stats that way", () => {
    expect(betterHigh(axis({ lowerIsBetter: true }), "value")).toBe(false);
    expect(betterHigh(axis({ lowerIsBetter: true }), "percentile")).toBe(true);
    expect(betterHigh(axis(), "value")).toBe(true);
  });
});

describe("scatter points", () => {
  it("plots only the rows the table filters keep that have the pool's minutes, with both axes present", () => {
    const visible = Uint8Array.from([1, 1, 1, 0, 1, 1]);
    const pool = Uint8Array.from([1, 1, 0, 1, 1, 1]);
    const points = pointSet(6, { visible, pool }, [1, NaN, 3, 4, 5, 6], [1, 2, 3, 4, NaN, 6]);
    expect(Array.from(points.rows)).toEqual([0, 5]);
    expect(Array.from(points.x)).toEqual([1, 6]);
    expect(Array.from(points.y)).toEqual([1, 6]);
    expect(points.inView).toBe(4);
  });

  it("takes every row when there is no mask", () => {
    const points = pointSet(3, { visible: null, pool: null }, [1, 2, 3], [3, 2, 1]);
    expect(Array.from(points.rows)).toEqual([0, 1, 2]);
    expect(points.inView).toBe(3);
  });
});

describe("scatter axes", () => {
  const groups = [...POS_GROUPS, "ALL"] as const;
  const keys = new Set(STATS.map((d) => d.key));

  it("every position, and no position, opens on two different catalog stats", () => {
    for (const group of groups) {
      const { x, y } = DEFAULT_AXES[group];
      expect(keys.has(x), `${group} x`).toBe(true);
      expect(keys.has(y), `${group} y`).toBe(true);
      expect(x).not.toBe(y);
    }
  });

  it("keeps a saved pair only while both columns exist", () => {
    const available = new Set([...keys, "my-composite"]);
    expect(axesFor("ATA", { x: "my-composite", y: "G/90" }, available)).toEqual({ x: "my-composite", y: "G/90" });
    expect(axesFor("ATA", { x: "deleted", y: "G/90" }, available)).toEqual(DEFAULT_AXES.ATA);
    expect(axesFor("ATA", undefined, available)).toEqual(DEFAULT_AXES.ATA);
  });

  it("the store keeps one pair per position of the Pos filter for the session", () => {
    appStore.getState().setGraphAxes("ATA", { x: "xG/90", y: "G/90" });
    appStore.getState().setGraphAxes("ZAG", { x: "Hdr%", y: "Int/90" });
    expect(appStore.getState().ui.graphs.axes).toEqual({
      ATA: { x: "xG/90", y: "G/90" },
      ZAG: { x: "Hdr%", y: "Int/90" },
    });
    appStore.getState().setGraphLabels(20);
    expect(appStore.getState().ui.graphs.labels).toBe(20);
    appStore.setState(appStore.getInitialState(), true);
    expect(appStore.getState().ui.graphs).toEqual({ axes: {}, labels: 10 });
  });
});
