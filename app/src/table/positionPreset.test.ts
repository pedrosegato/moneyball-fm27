import { describe, expect, it } from "vitest";
import type { FilterSpec } from "@/engine/universe";
import { presetGroupOf } from "./positionPreset";

const positions = (...values: string[]): FilterSpec => ({ col: "naturalPositions", kind: "set", values });

describe("presetGroupOf", () => {
  it("maps a single position to its group", () => {
    expect(presetGroupOf([positions("ST")])).toBe("ATA");
    expect(presetGroupOf([positions("DC")])).toBe("ZAG");
  });

  it("maps several positions of one group to that group", () => {
    expect(presetGroupOf([positions("DL", "DR")])).toBe("LAT");
  });

  it("is null across groups, with no position filter, or with an empty one", () => {
    expect(presetGroupOf([positions("ST", "AMC")])).toBeNull();
    expect(presetGroupOf([{ col: "age", kind: "range", max: 23 }])).toBeNull();
    expect(presetGroupOf([positions()])).toBeNull();
    expect(presetGroupOf([])).toBeNull();
  });

  it("is null when a value is not a position", () => {
    expect(presetGroupOf([positions("ST", "XX")])).toBeNull();
  });
});
