import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { Snapshot } from "@/data/types";
import {
  GK,
  GK_INDEX,
  groupsOf,
  legacyGroup,
  legacySlotGroup,
  mainGroup,
  naturalPositions,
  POS_GROUPS,
  POS_NAMES,
  positionSet,
  slotCode,
  slotGroup,
} from "./positions";

const DEV_DATA = path.resolve(import.meta.dirname, "../../../.dev-data");
const GOLDEN = path.join(DEV_DATA, "golden/old-engine.json");
const RAW = path.join(DEV_DATA, "snapshots/2026-11-11-raw-competitive.json");

function ratings(values: Partial<Record<(typeof POS_NAMES)[number], number>>): number[] {
  return POS_NAMES.map((name) => values[name] ?? 1);
}

describe("mainGroup", () => {
  it("winger ML/AML is PON", () => {
    expect(mainGroup(ratings({ ML: 20, AML: 19 }))).toBe("PON");
  });
  it("ST 20 + AMC 18 is ATA", () => {
    expect(mainGroup(ratings({ ST: 20, AMC: 18 }))).toBe("ATA");
  });
  it("tie AMC 20 ST 20 is ATA", () => {
    expect(mainGroup(ratings({ AMC: 20, ST: 20 }))).toBe("ATA");
  });
  it("DC 20 DM 15 is ZAG", () => {
    expect(mainGroup(ratings({ DC: 20, DM: 15 }))).toBe("ZAG");
  });
  it("GK is GK", () => {
    expect(mainGroup(ratings({ GK: 20 }))).toBe("GK");
  });
});

describe("groupsOf / naturalPositions", () => {
  it("lists groups at or above the minimum, main group first", () => {
    expect(groupsOf(ratings({ DC: 20, DM: 16, ST: 5 }))).toEqual(["ZAG", "VOL"]);
  });
  it("naturalPositions keeps positions rated at least min", () => {
    expect(naturalPositions(ratings({ DC: 20, DM: 17 }))).toEqual(["DC"]);
  });
});

describe("positionSet", () => {
  it("expands sides and slashes the way the old page read the position string", () => {
    expect([...positionSet("D/WB (RL), DM, AM (C)")]).toEqual(["D(R)", "D(L)", "WB(R)", "WB(L)", "DM", "AM(C)"]);
    expect([...positionSet("ST (C)")]).toEqual(["ST(C)"]);
    expect([...positionSet("GK")]).toEqual(["GK"]);
    expect(positionSet("").size).toBe(0);
    expect(positionSet(null).size).toBe(0);
  });
});

describe("legacySlotGroup / slotGroup", () => {
  it("maps a formation slot to the five old groups", () => {
    const slots = ["GK", "D(L)", "D(C)", "WB(R)", "DM", "M(C)", "M(L)", "AM(L)", "AM(C)", "ST(C)"];
    expect(slots.map(legacySlotGroup)).toEqual(["GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "AM", "AM", "ST"]);
    expect(legacySlotGroup("SW")).toBeNull();
  });

  it("maps a formation slot to the eight groups", () => {
    const slots = ["GK", "D(L)", "D(C)", "WB(R)", "DM", "M(C)", "M(L)", "AM(L)", "AM(C)", "ST(C)"];
    expect(slots.map(slotGroup)).toEqual(["GK", "LAT", "ZAG", "LAT", "VOL", "MC", "PON", "PON", "MEI", "ATA"]);
    expect(slotGroup("X(Y)")).toBeNull();
  });
});

const missing = [GOLDEN, RAW].filter((f) => !fs.existsSync(f));
if (missing.length) console.warn(`SKIPPED legacyGroup parity: missing ${missing.join(", ")}`);

describe.skipIf(missing.length > 0)("legacyGroup parity with the old engine", () => {
  let golden: { players: Record<string, { grp: string | null }> };
  let snapshot: Snapshot;
  beforeAll(() => {
    golden = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
    snapshot = JSON.parse(fs.readFileSync(RAW, "utf8"));
  });

  it("legacyGroup matches golden grpOf for every played player", () => {
    let compared = 0;
    const mismatches: string[] = [];
    for (const p of snapshot.players) {
      const g = golden.players[String(p.uid)];
      if (!g) continue;
      compared++;
      const got = legacyGroup(p.position);
      if (got !== g.grp) mismatches.push(`${p.uid} "${p.position}": ${got} != ${g.grp}`);
    }
    expect(mismatches.slice(0, 10)).toEqual([]);
    expect(compared).toBeGreaterThan(30_000);
  });
});

describe("slotCode", () => {
  it("writes a formation slot as its pitch position", () => {
    expect(slotCode("ST(C)")).toBe("ST");
    expect(slotCode("D(C)")).toBe("DC");
    expect(slotCode("AM(L)")).toBe("AML");
    expect(slotCode("GK")).toBe("GK");
  });
});

describe("GK_INDEX", () => {
  it("points at the keepers in the position groups", () => {
    expect(POS_GROUPS[GK_INDEX]).toBe(GK);
  });
});
