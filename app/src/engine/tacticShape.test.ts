import { describe, expect, it } from "vitest";
import { POS_NAMES } from "./positions";
import { FORMATIONS } from "./tacticalFit";
import {
  engineSlots,
  FM_SPOTS,
  moveSlot,
  positionAt,
  positionRating,
  rolesFor,
  type Spot,
  setSlotRole,
  shapeFromFormation,
  shapeFromTactic,
  spotOf,
  tacticKey,
} from "./tacticShape";
import { sampleTactic } from "./testing/tactic";

const spot = (s: Spot) => `${s.row},${s.col}`;
const shape = shapeFromTactic(sampleTactic())!;

describe("tacticShape", () => {
  it("lays the 24 FM positions out as the game's tactic screen", () => {
    expect(FM_SPOTS).toHaveLength(24);
    expect(FM_SPOTS.filter((s) => s.row === 6).map(spot)).toEqual(["6,3"]);
    expect(FM_SPOTS.filter((s) => s.row === 1).map(spot)).toEqual(["1,2", "1,3", "1,4"]);
    for (const s of FM_SPOTS) expect(spotOf(positionAt(s)!)).toEqual(s);
  });

  it("places a 4-3-3 and its 4-1-4-1 without the ball", () => {
    expect(shape.map((s) => spot(spotOf(s.ip)))).toEqual([
      "6,3",
      "5,5",
      "5,4",
      "5,2",
      "5,1",
      "2,1",
      "3,4",
      "3,2",
      "3,3",
      "2,5",
      "1,3",
    ]);
    expect(shape.map((s) => spot(spotOf(s.oop)))).toEqual([
      "6,3",
      "5,5",
      "5,4",
      "5,2",
      "5,1",
      "3,1",
      "4,3",
      "3,4",
      "3,2",
      "3,5",
      "1,3",
    ]);
  });

  it("gives the engine the in-possession positions as slots", () =>
    expect(engineSlots(shape)).toEqual([
      "GK",
      "D(R)",
      "D(C)",
      "D(C)",
      "D(L)",
      "AM(L)",
      "M(C)",
      "M(C)",
      "M(C)",
      "AM(R)",
      "ST(C)",
    ]));

  it("every formation's shape gives the engine that formation's slots", () => {
    for (const [name, slots] of Object.entries(FORMATIONS))
      expect(engineSlots(shapeFromFormation(name))).toEqual(slots);
  });

  it("3-5-2 spreads three centre-backs and two strikers over the lanes", () => {
    const slots = shapeFromFormation("3-5-2");
    expect(slots.filter((s) => s.ip.position === "DC").map((s) => s.ip.side)).toEqual(["L", "C", "R"]);
    expect(slots.filter((s) => s.ip.position === "ST").map((s) => s.ip.side)).toEqual(["L", "R"]);
  });

  it("a formation starts with the generic role of each position", () => {
    const slots = shapeFromFormation("4-3-3");
    expect(slots.map((s) => s.ip.roleId)).toEqual([
      "ip:0",
      "ip:2",
      "ip:1",
      "ip:1",
      "ip:2",
      "ip:4",
      "ip:5",
      "ip:5",
      "ip:7",
      "ip:7",
      "ip:11",
    ]);
    expect(slots.map((s) => s.oop.roleId)).toEqual([
      "oop:0",
      "oop:9",
      "oop:3",
      "oop:3",
      "oop:9",
      "oop:15",
      "oop:20",
      "oop:20",
      "oop:38",
      "oop:38",
      "oop:42",
    ]);
  });

  it("lists a position's roles in a phase", () => {
    expect(rolesFor("DC", "ip").map((r) => r.id)).toEqual(["ip:1", "ip:14", "ip:24", "ip:29", "ip:51", "ip:54"]);
    expect(rolesFor("ST", "oop").map((r) => r.id)).toEqual(["oop:42", "oop:43", "oop:44", "oop:45"]);
  });

  it("moving a slot keeps a role that fits", () => {
    const moved = moveSlot(shape, 8, "ip", { row: 2, col: 3 })!;
    expect(moved[8].ip).toEqual({ position: "AMC", side: "C", roleId: "ip:9" });
    expect(moved[8].oop).toEqual(shape[8].oop);
  });

  it("a role that doesn't fit the new position becomes its generic role", () => {
    expect(moveSlot(shape, 6, "ip", { row: 4, col: 3 })![6].ip.roleId).toBe("ip:4");
    const moved = moveSlot(shape, 6, "oop", { row: 3, col: 3 })!;
    expect(moved[6].oop).toEqual({ position: "MC", side: "C", roleId: "oop:20" });
    expect(moved[6].ip).toEqual(shape[6].ip);
  });

  it("a move onto a taken spot, the GK spot, or of the keeper does nothing", () => {
    expect(moveSlot(shape, 6, "ip", { row: 3, col: 2 })).toBeNull();
    expect(moveSlot(shape, 6, "ip", { row: 6, col: 3 })).toBeNull();
    expect(moveSlot(shape, 0, "ip", { row: 4, col: 3 })).toBeNull();
    expect(moveSlot(shape, 6, "ip", { row: 1, col: 1 })).toBeNull();
  });

  it("switches only to a role that fits", () => {
    expect(setSlotRole(shape, 1, "ip", "ip:52")![1].ip.roleId).toBe("ip:52");
    expect(setSlotRole(shape, 1, "ip", "ip:1")).toBeNull();
  });

  it("a role the catalogue doesn't know, or that doesn't fit, becomes the generic one", () => {
    for (const roleId of ["ip:20", "ip:1"]) {
      const tactic = sampleTactic();
      tactic.slots[10].ip.roleId = roleId;
      const slots = shapeFromTactic(tactic)!;
      expect(slots[10].ip.roleId).toBe("ip:11");
      expect(slots.filter((_, k) => k !== 10)).toEqual(shape.filter((_, k) => k !== 10));
    }
  });

  it("rejects a tactic it can't draw", () => {
    const broken = (edit: (t: ReturnType<typeof sampleTactic>) => void) => {
      const t = sampleTactic();
      edit(t);
      return shapeFromTactic(t);
    };
    expect(broken((t) => (t.slots[3].ip.side = "R"))).toBeNull();
    expect(broken((t) => (t.slots[3].ip.position = "SW"))).toBeNull();
    expect(broken((t) => (t.slots[0].oop.position = "ST"))).toBeNull();
    expect(broken((t) => t.slots.pop())).toBeNull();
    expect(broken((t) => (t.slots[0].ip.side = "L"))).toBeNull();
    expect(broken((t) => (t.slots[4].ip.side = "R"))).toBeNull();
  });

  it("a tactic's key changes with its players and roles, not its bench", () => {
    expect(tacticKey(sampleTactic())).toBe(tacticKey(sampleTactic(undefined, [99])));
    expect(tacticKey(sampleTactic())).not.toBe(tacticKey(sampleTactic([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 77])));
  });

  it("reads the FM rating of a position", () => {
    expect(
      positionRating(
        POS_NAMES.map((_, k) => k + 1),
        "DR",
      ),
    ).toBe(5);
    expect(positionRating([], "GK")).toBe(0);
  });
});
