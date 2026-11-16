import { STATS, type StatDef } from "@/engine/stats/catalog";
import { rowLeaders } from "./leaders";

const stat = (key: string): StatDef => STATS.find((d) => d.key === key)!;

describe("the leader of a stat row", () => {
  it("is the highest value when more is better", () => {
    expect(rowLeaders([0.41, 0.62, 0.3], stat("xA/90"))).toEqual([false, true, false]);
  });

  it("is the lowest value when the stat counts less as better", () => {
    const lost = stat("PossLost/90");
    expect(lost.lowerIsBetter).toBe(true);
    expect(rowLeaders([10.2, 8.1, 9], lost)).toEqual([false, true, false]);
  });

  it("is everyone tied with the best as the row shows it", () => {
    expect(rowLeaders([0.414, 0.4149, 0.39], stat("xA/90"))).toEqual([true, true, false]);
    expect(rowLeaders([0.416, 0.414], stat("xA/90"))).toEqual([true, false]);
    expect(rowLeaders([55.4, 55.2, 41], stat("Pas%"))).toEqual([true, true, false]);
  });

  it("skips a player without the stat", () => {
    expect(rowLeaders([Number.NaN, 0.2, 0.5], stat("xA/90"))).toEqual([false, false, true]);
    expect(rowLeaders([Number.NaN, 9, 12], stat("PossLost/90"))).toEqual([false, true, false]);
  });

  it("names nobody when fewer than two players have the stat", () => {
    expect(rowLeaders([Number.NaN, 0.5, Number.NaN], stat("xA/90"))).toEqual([false, false, false]);
    expect(rowLeaders([0.5], stat("xA/90"))).toEqual([false]);
    expect(rowLeaders([Number.NaN, Number.NaN], stat("xA/90"))).toEqual([false, false]);
  });
});
