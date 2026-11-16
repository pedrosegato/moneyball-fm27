import { hitGrid, nearestPoint } from "./hitTest";

describe("hit test", () => {
  it("finds the nearest point within the hit radius, and none beyond it", () => {
    const grid = hitGrid(Float32Array.from([10, 50, 52]), Float32Array.from([10, 50, 50]), 12);
    expect(nearestPoint(grid, 49, 50, 12)).toBe(1);
    expect(nearestPoint(grid, 53, 51, 12)).toBe(2);
    expect(nearestPoint(grid, 18, 10, 12)).toBe(0);
    expect(nearestPoint(grid, 23, 10, 12)).toBe(-1);
    expect(nearestPoint(grid, 200, 200, 12)).toBe(-1);
  });
});
