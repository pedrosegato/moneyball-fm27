import { axis } from "../testing/axis";
import { hitGrid, nearestPoint } from "./hitTest";
import { niceTicks, scaleOf } from "./scale";
import { betterHigh } from "./scatter";

describe("scatter scale", () => {
  it("ticks land on round numbers inside the domain", () => {
    expect(niceTicks(0, 0.93)).toEqual([0, 0.2, 0.4, 0.6, 0.8]);
    expect(niceTicks(0, 100)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(niceTicks(-0.37, 0.41)).toEqual([-0.2, 0, 0.2, 0.4]);
    expect(niceTicks(3, 3)).toEqual([3]);
  });

  it("a fewer-is-better axis in Valor puts the smaller value at the larger pixel, and the hit test finds it there", () => {
    const lost = [1, 5, 3];
    const possLost = axis({ lowerIsBetter: true });
    const x = scaleOf(lost, betterHigh(possLost, "value"), "value", 0, 300, false);
    expect(x.at(1)).toBeGreaterThan(x.at(3));
    expect(x.at(3)).toBeGreaterThan(x.at(5));
    const y = scaleOf(lost, betterHigh(possLost, "value"), "value", 0, 200, true);
    expect(y.at(1)).toBeLessThan(y.at(5));
    const pct = scaleOf(lost, betterHigh(possLost, "percentile"), "percentile", 0, 300, false);
    expect(pct.at(90)).toBeGreaterThan(pct.at(10));
    const plain = scaleOf(lost, betterHigh(axis(), "value"), "value", 0, 300, false);
    expect(plain.at(1)).toBeLessThan(plain.at(5));

    const px = Float32Array.from(lost, (v) => x.at(v));
    const py = Float32Array.from(lost, (v) => y.at(v));
    const grid = hitGrid(px, py, 12);
    expect(nearestPoint(grid, px[0] - 3, py[0] + 2, 12)).toBe(0);
    expect(nearestPoint(grid, px[1] + 3, py[1] - 2, 12)).toBe(1);
    expect(px[0]).toBeGreaterThan(250);
  });
});
