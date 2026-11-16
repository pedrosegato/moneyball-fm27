import { REFMIN } from "@/engine/percentiles";
import { STATS } from "@/engine/stats/catalog";
import { TIERS } from "@/lib/quality";
import { axis } from "../testing/axis";
import { labeledPoints } from "./labels";
import { markColor, type PointLevels, pointLevels, zScores } from "./levels";
import { betterHigh, pointSet } from "./scatter";

describe("z-scores", () => {
  it("z-score inverts lowerIsBetter", () => {
    const values = [1, 2, 3, 4, 5];
    const lowerBetter = Array.from(zScores(values, false));
    const higherBetter = Array.from(zScores(values, true));
    expect(lowerBetter[0]).toBeGreaterThan(0);
    expect(lowerBetter[4]).toBeLessThan(0);
    lowerBetter.forEach((z, k) => {
      expect(z).toBeCloseTo(-higherBetter[k], 12);
    });

    const possLost = STATS.find((d) => d.key === "PossLost/90")!;
    expect(possLost.lowerIsBetter).toBe(true);
    const points = pointSet(4, {}, [3, 1, 2, 4], [0.2, 0.2, 0.3, 0.3]);
    const xAxis = axis({ lowerIsBetter: true });
    const yAxis = axis();
    expect(labeledPoints(points, 2, betterHigh(xAxis, "value"), betterHigh(yAxis, "value"))).toEqual([2, 1]);
    expect(labeledPoints(points, 2, true, true)).toEqual([3, 2]);
  });

  it("gives every point the same z when an axis has no spread, instead of dividing by zero", () => {
    expect(Array.from(zScores([2, 2, 2], true))).toEqual([0, 0, 0]);
  });
});

describe("scatter levels", () => {
  const ladder = Array.from({ length: 20 }, (_, k) => k);
  const tierNames = (levels: PointLevels) => Array.from(levels.tier, (t) => TIERS[t]);

  it("reads each point's level from the percentile of z(x) + z(y) among the plotted points", () => {
    const levels = pointLevels(pointSet(20, {}, ladder, ladder), true, true)!;
    expect(Array.from(levels.pct)).toEqual([
      4, 9, 14, 19, 23, 28, 33, 38, 42, 47, 52, 57, 61, 66, 71, 76, 80, 85, 90, 95,
    ]);
    expect(tierNames(levels)).toEqual([
      ...Array(4).fill("ruim"),
      ...Array(4).fill("abaixo"),
      ...Array(6).fill("mediano"),
      ...Array(4).fill("bom"),
      "elite",
      "elite",
    ]);
    expect(levels.counts).toEqual({ elite: 2, bom: 4, mediano: 6, abaixo: 4, ruim: 4 });
  });

  it("counts a lower-is-better axis inverted, so the point that loses the ball least ranks best", () => {
    const fewerIsBetter = ladder.map((k) => 19 - k);
    const levels = pointLevels(pointSet(20, {}, fewerIsBetter, ladder), false, true)!;
    expect(TIERS[levels.tier[19]]).toBe("elite");
    expect(TIERS[levels.tier[0]]).toBe("ruim");
    const raw = pointLevels(pointSet(20, {}, fewerIsBetter, ladder), true, true)!;
    expect(new Set(raw.pct)).toEqual(new Set([50]));
    expect(raw.counts).toEqual({ elite: 0, bom: 0, mediano: 20, abaixo: 0, ruim: 0 });
  });

  it("gives tied points the same level", () => {
    const levels = pointLevels(
      pointSet(20, {}, [...ladder.slice(0, 18), 17, 17], [...ladder.slice(0, 18), 17, 17]),
      true,
      true,
    )!;
    expect(levels.pct[17]).toBe(levels.pct[18]);
    expect(levels.pct[18]).toBe(levels.pct[19]);
  });

  it("levels nobody when every point sits on the same spot, and still ranks a spread on one axis alone", () => {
    const same = Array(20).fill(0.4);
    expect(pointLevels(pointSet(20, {}, same, same), true, true)).toBeNull();
    const levels = pointLevels(pointSet(20, {}, same, ladder), true, true)!;
    expect(TIERS[levels.tier[19]]).toBe("elite");
    expect(TIERS[levels.tier[0]]).toBe("ruim");
  });

  it("levels nobody when fewer points than a percentile needs are plotted", () => {
    expect(pointLevels(pointSet(REFMIN - 1, {}, ladder.slice(1), ladder.slice(1)), true, true)).toBeNull();
    expect(pointLevels(pointSet(0, {}, [], []), true, true)).toBeNull();
  });
});

describe("canvas mark colours", () => {
  const style = (values: Record<string, string>) => ({ getPropertyValue: (name: string) => values[name] ?? "" });

  it("reads each mark's colour from its token, trimmed", () => {
    expect(markColor(style({ "--tier-elite": " oklch(0.5 0.1 165)" }), "elite")).toBe("oklch(0.5 0.1 165)");
    expect(markColor(style({ "--text-muted": "#abcdef " }), "none")).toBe("#abcdef");
  });

  it("falls back to the dark theme's colour when a token reads empty, so no dot is painted canvas black", () => {
    expect(TIERS.map((t) => markColor(style({}), t))).toEqual(["#057c59", "#62bcf1", "#f2e751", "#f38f17", "#c73f15"]);
    expect(markColor(style({ "--text-muted": "  " }), "none")).toBe("#9ca5b4");
  });
});
