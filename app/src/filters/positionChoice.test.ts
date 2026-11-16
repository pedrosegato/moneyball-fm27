import { describe, expect, it } from "vitest";
import type { FilterSpec } from "@/engine/universe";
import { ownsPositionFilter, positionFilter, positionReadingOf } from "./positionChoice";

const positions = (...values: string[]): FilterSpec => ({ col: "naturalPositions", kind: "set", values });
const OUTFIELD = ["SW", "DL", "DC", "DR", "DM", "ML", "MC", "MR", "AML", "AMC", "AMR", "ST", "WBL", "WBR"];

describe("position choice", () => {
  it("writes the positions of a group, or every outfield one for Linha", () => {
    expect(positionFilter("ATA")).toEqual(positions("ST"));
    expect(positionFilter("LAT")).toEqual(positions("DL", "DR", "WBL", "WBR"));
    expect(positionFilter("linha")).toEqual(positions(...OUTFIELD));
  });

  it("reads Todas without a Pos filter, and the group whose positions the filter holds exactly", () => {
    expect(positionReadingOf([{ col: "age", kind: "range", max: 23 }])).toBe("todas");
    expect(positionReadingOf([positions("ST")])).toBe("ATA");
    expect(positionReadingOf([positions("WBR", "DL", "DR", "WBL")])).toBe("LAT");
    expect(positionReadingOf([positions(...[...OUTFIELD].reverse())])).toBe("linha");
  });

  it("reads any other Pos filter as personalizada, which keeps its chip", () => {
    for (const filter of [positions("DL"), positions("ST", "AMC"), positions(), positions(...OUTFIELD, "GK")]) {
      expect(positionReadingOf([filter])).toBe("personalizada");
      expect(ownsPositionFilter([filter])).toBe(false);
    }
    expect(ownsPositionFilter([positions("ST")])).toBe(true);
    expect(ownsPositionFilter([])).toBe(false);
  });
});
