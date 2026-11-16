import { describe, expect, it } from "vitest";
import { STYLE_STATS } from "@/engine/data/groups";
import { POS_GROUPS, POS_NAMES, type PosGroup } from "@/engine/positions";
import { STATS, type StatDef, type StatKey, statIndex } from "@/engine/stats/catalog";
import { pitchLevels, profileStats, type StatAnalysis, type StatLine, statLines, TOP_STATS, topStats } from "./profile";

const def = (key: StatKey): StatDef => STATS[statIndex(key)];

function analysisOf(
  values: Record<StatKey, [number, number]>,
  pct: Record<StatKey, [number, number]>,
  groups: [PosGroup, PosGroup] = ["ATA", "GK"],
  pool: [number, number] = [1, 1],
): StatAnalysis {
  const blank = () => Float64Array.from([NaN, NaN]);
  const reference = new Float64Array(2 * POS_GROUPS.length).fill(NaN);
  reference.set([1.5, 3], 2 * POS_GROUPS.indexOf("ATA"));
  reference.set([0.5, 0.9], 2 * POS_GROUPS.indexOf("GK"));
  return {
    cols: Object.fromEntries(STATS.map((d) => [d.key, values[d.key] ? Float64Array.from(values[d.key]) : blank()])),
    pct: Object.fromEntries(STATS.map((d) => [d.key, Float32Array.from(pct[d.key] ?? [NaN, NaN])])),
    reference: Object.fromEntries(STATS.map((d) => [d.key, reference])),
    group: Uint8Array.from(groups, (g) => POS_GROUPS.indexOf(g)),
    pool: Uint8Array.from(pool),
  };
}

const line = (key: StatKey, pct: number): StatLine => ({ def: def(key), value: 1, pct, median: NaN, top: NaN });

describe("statLines", () => {
  const minutes = Float64Array.from([2000, 2000]);

  it("reads each stat's value, percentile and the median and top 5% of the player's own group", () => {
    const analysis = analysisOf({ "G/90": [0.41, 0.02] }, { "G/90": [91, 40] });
    const [striker] = statLines(analysis, 0, minutes).filter((l) => l.def.key === "G/90");
    expect(striker).toMatchObject({ value: 0.41, pct: 91, median: 1.5, top: 3, missing: undefined });
    const [keeper] = statLines(analysis, 1, minutes).filter((l) => l.def.key === "G/90");
    expect(keeper).toMatchObject({ value: 0.02, pct: 40, median: 0.5, top: 0.9 });
  });

  it("says why a percentile is missing: too few in the group, fewer minutes than the pool, or the stat's own sample", () => {
    const analysis = analysisOf(
      { "G/90": [0.41, 0.3], "SoT%": [NaN, NaN], Shots: [0, NaN] },
      {},
      ["ATA", "ATA"],
      [1, 0],
    );
    const lines = new Map(statLines(analysis, 0, minutes).map((l) => [l.def.key, l]));
    expect(lines.get("G/90")!.missing).toBe("group");
    expect(statLines(analysis, 1, minutes).find((l) => l.def.key === "G/90")!.missing).toBe("pool");
    expect(lines.get("SoT%")!.missing).toBe("sample");
    expect(lines.get("xG/90")!.missing).toBeUndefined();
  });

  it("lists every stat of the catalog, in its order", () => {
    expect(statLines(analysisOf({}, {}), 0, minutes).map((l) => l.def.key)).toEqual(STATS.map((d) => d.key));
  });
});

describe("topStats", () => {
  it("ranks the highest percentiles first and keeps ten", () => {
    const lines = [
      "G/90",
      "xG/90",
      "Drb/90",
      "KP/90",
      "Pas%",
      "PrPass/90",
      "Int/90",
      "Clr/90",
      "Blk/90",
      "Tck%",
      "Hdr%",
      "Dist/90",
    ].map((key, k) => line(key, 40 + k * 5));
    const top = topStats(lines);
    expect(TOP_STATS).toBe(10);
    expect(top.map((l) => l.def.key)).toEqual(
      lines
        .slice(2)
        .reverse()
        .map((l) => l.def.key),
    );
  });

  it("leaves out stats with no percentile", () => {
    expect(topStats([line("G/90", NaN), line("xG/90", 50)]).map((l) => l.def.key)).toEqual(["xG/90"]);
  });

  it("leaves out season totals, discipline and minutes per game, which reward minutes or caution, not play", () => {
    const lines = [
      line("Gls", 99),
      line("PasA", 99),
      line("Yel/90", 98),
      line("Off/90", 97),
      line("Mins/Gm", 96),
      line("G/90", 60),
    ];
    expect(topStats(lines).map((l) => l.def.key)).toEqual(["G/90"]);
  });

  it("keeps the order it was given between equal percentiles, the catalog's from statLines", () => {
    expect(topStats([line("xG/90", 80), line("G/90", 80)]).map((l) => l.def.key)).toEqual(["xG/90", "G/90"]);
  });
});

describe("profileStats", () => {
  it("takes the group's profile stats, in their order", () => {
    expect(profileStats("ATA").map((d) => d.key)).toEqual(STYLE_STATS.ATA);
    expect(profileStats("GK").every((d) => d.gkOnly || !d.outfieldOnly)).toBe(true);
  });
});

describe("pitchLevels", () => {
  const rated = (values: Partial<Record<(typeof POS_NAMES)[number], number>>) => POS_NAMES.map((n) => values[n] ?? 1);

  it("marks 18+ as natural and 15-17 as secondary, leaving the rest off", () => {
    expect(pitchLevels(rated({ ST: 20, AMR: 18, AML: 15, MC: 14 }))).toEqual({
      ST: "natural",
      AMR: "natural",
      AML: "secundaria",
    });
  });

  it("gives nothing for a player with no ratings", () => {
    expect(pitchLevels([])).toEqual({});
  });
});
