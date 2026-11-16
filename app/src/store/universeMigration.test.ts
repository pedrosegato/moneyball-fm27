import { describe, expect, it } from "vitest";
import { pinnedFiltersOf } from "./universeMigration";

describe("pinnedFiltersOf", () => {
  it("turns a league pin and a minutes pin into table filters", () => {
    const saved = { group: "ATA", minMinutes: 1500, maxMinutes: 3000, leagues: ["Premier League"], pinned: [] };
    expect(pinnedFiltersOf(saved)).toEqual([
      { col: "division", kind: "set", values: ["Premier League"] },
      { col: "minutes", kind: "range", min: 1500, max: 3000 },
    ]);
  });

  it("keeps other pinned filters as they are", () => {
    const age = { col: "age", kind: "range", max: 23 };
    expect(pinnedFiltersOf({ group: "OUTFIELD", minMinutes: 900, pinned: [age] })).toEqual([age]);
  });

  it("drops the group and a minimum saved without a maximum", () => {
    expect(pinnedFiltersOf({ group: "ZAG", minMinutes: 900, pinned: [] })).toEqual([]);
    expect(pinnedFiltersOf({ group: "ATA", minMinutes: 1500, leagues: ["Série A"], pinned: [] })).toEqual([
      { col: "division", kind: "set", values: ["Série A"] },
    ]);
  });

  it("reads a league pin alone, a maximum alone, and no league list as every league", () => {
    expect(pinnedFiltersOf({ minMinutes: 900, leagues: ["Série A"], pinned: [] })).toEqual([
      { col: "division", kind: "set", values: ["Série A"] },
    ]);
    expect(pinnedFiltersOf({ minMinutes: 0, maxMinutes: 2000, pinned: [] })).toEqual([
      { col: "minutes", kind: "range", max: 2000 },
    ]);
    expect(pinnedFiltersOf({ minMinutes: 900, maxMinutes: 2000, pinned: [] })).toEqual([
      { col: "minutes", kind: "range", min: 900, max: 2000 },
    ]);
    expect(pinnedFiltersOf({ minMinutes: 900, leagues: [], pinned: [] })).toEqual([]);
  });

  it("makes no minutes filter of any minutes, which constrains nothing", () => {
    expect(pinnedFiltersOf({ minMinutes: 0, pinned: [] })).toEqual([]);
  });

  it("keeps a maximum saved without a minimum as a maximum alone", () => {
    expect(pinnedFiltersOf({ maxMinutes: 2500, pinned: [] })).toEqual([{ col: "minutes", kind: "range", max: 2500 }]);
  });

  it("keeps one filter per column from a save edited by hand", () => {
    const pinnedLeague = { col: "division", kind: "set", values: ["Série B"] };
    expect(pinnedFiltersOf({ minMinutes: 900, leagues: ["Série A"], pinned: [pinnedLeague, pinnedLeague] })).toEqual([
      { col: "division", kind: "set", values: ["Série A"] },
    ]);
  });

  it("gives nothing for junk", () => {
    for (const junk of [null, undefined, 7, "x", [], { pinned: "no" }]) expect(pinnedFiltersOf(junk)).toEqual([]);
  });
});
