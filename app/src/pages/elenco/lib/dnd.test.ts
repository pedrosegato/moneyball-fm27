import { describe, expect, it } from "vitest";
import { POS_NAMES } from "@/engine/positions";
import { shapeFromTactic } from "@/engine/tacticShape";
import { sampleTactic } from "@/engine/testing/tactic";
import {
  dropEdit,
  dropTargets,
  fitOf,
  freeSpotId,
  freeSpotOf,
  keyboardStep,
  landingShape,
  OFF_PITCH,
  playerId,
  slotId,
} from "./dnd";

const picks = {
  "0": 10,
  "1": 11,
  "2": 12,
  "3": null,
  "4": 14,
  "5": 15,
  "6": 16,
  "7": 17,
  "8": 18,
  "9": 19,
  "10": 20,
};
const lineup = { slots: shapeFromTactic(sampleTactic())!, picks };
const withPicks = (next: Record<string, number | null>) => ({ ...lineup, picks: { ...picks, ...next } });

describe("dropping on the pitch", () => {
  it("a slot dropped on another swaps them", () => {
    expect(dropEdit(slotId(0), slotId(1), lineup, "ip")).toEqual(withPicks({ "0": 11, "1": 10 }));
    expect(dropEdit(slotId(4), slotId(3), lineup, "ip")).toEqual(withPicks({ "3": 14, "4": null }));
  });

  it("a squad player dropped on a slot takes it", () => {
    expect(dropEdit(playerId(99), slotId(3), lineup, "ip")).toEqual(withPicks({ "3": 99 }));
    expect(dropEdit(playerId(11), slotId(0), lineup, "ip")).toEqual(withPicks({ "0": 11, "1": 10 }));
  });

  it("a slot dropped off the pitch empties it", () => {
    expect(dropEdit(slotId(4), OFF_PITCH, lineup, "ip")).toEqual(withPicks({ "4": null }));
  });

  it("a cancelled drag or a drop on its own slot changes nothing", () => {
    expect(dropEdit("slot:4", null, lineup, "ip")).toBeNull();
    expect(dropEdit("slot:4", "slot:4", lineup, "ip")).toBeNull();
    expect(dropEdit(playerId(99), OFF_PITCH, lineup, "ip")).toBeNull();
    expect(dropEdit(playerId(99), null, lineup, "ip")).toBeNull();
    expect(dropEdit(playerId(14), slotId(4), lineup, "ip")).toBeNull();
  });

  it("a pitch card dropped on a free position moves the slot there, with its player", () => {
    const moved = dropEdit(slotId(6), freeSpotId({ row: 4, col: 3 }), lineup, "ip")!;
    expect(moved.slots[6].ip).toEqual({ position: "DM", side: "C", roleId: "ip:4" });
    expect(moved.slots[6].oop).toEqual(lineup.slots[6].oop);
    expect(moved.picks).toEqual(picks);
  });

  it("in Sem Posse de Bola the move changes the out-of-possession position", () => {
    const moved = dropEdit(slotId(6), freeSpotId({ row: 3, col: 3 }), lineup, "oop")!;
    expect(moved.slots[6].oop.position).toBe("MC");
    expect(moved.slots[6].ip).toEqual(lineup.slots[6].ip);
  });

  it("a squad player or the keeper's card is never dropped on a free position", () => {
    const free = freeSpotId({ row: 4, col: 3 });
    expect(dropEdit(playerId(99), free, lineup, "ip")).toBeNull();
    expect(dropEdit(slotId(0), free, lineup, "ip")).toBeNull();
  });

  it("names a free position by its spot on the grid", () => {
    expect(freeSpotId({ row: 1, col: 4 })).toBe("spot:1-4");
    expect(freeSpotOf("spot:1-4")).toEqual({ row: 1, col: 4 });
    expect(freeSpotOf(slotId(3))).toBeNull();
    expect(freeSpotOf(null)).toBeNull();
  });
});

describe("the keyboard's drag", () => {
  const order = ["slot:10", "spot:1-4", "slot:8", "slot:0"];

  it("walks the targets in reading order, round the ends as the pitch's radios do", () => {
    expect(keyboardStep(order, "slot:10", "ArrowRight", "slot:0")).toBe("spot:1-4");
    expect(keyboardStep(order, "slot:10", "ArrowDown", "slot:0")).toBe("spot:1-4");
    expect(keyboardStep(order, "spot:1-4", "ArrowLeft", "slot:0")).toBe("slot:10");
    expect(keyboardStep(order, "slot:10", "ArrowUp", "slot:0")).toBe("slot:0");
    expect(keyboardStep(order, "slot:0", "ArrowRight", "slot:0")).toBe("slot:10");
  });

  it("lands a squad player on the slot picked first, and leaves other keys alone", () => {
    expect(keyboardStep(order, null, "ArrowRight", "slot:8")).toBe("slot:8");
    expect(keyboardStep(order, playerId(5), "ArrowUp", "slot:8")).toBe("slot:8");
    expect(keyboardStep(order, "slot:10", "Tab", "slot:0")).toBeNull();
  });

  it("a movable card walks the slots and the free positions; others walk the slots", () => {
    const targets = dropTargets(slotId(10), lineup.slots, "ip");
    expect(targets).toHaveLength(24);
    expect(targets.slice(0, 4)).toEqual(["spot:1-2", "slot:10", "spot:1-4", "slot:5"]);
    expect(targets).not.toContain("spot:6-3");
    const slotsOnly = [10, 5, 9, 7, 8, 6, 4, 3, 2, 1, 0].map(slotId);
    expect(dropTargets(slotId(0), lineup.slots, "ip")).toEqual(slotsOnly);
    expect(dropTargets(playerId(5), lineup.slots, "ip")).toEqual(slotsOnly);
  });

  it("in Sem Posse de Bola the free positions are those of the out-of-possession shape", () => {
    const targets = dropTargets(slotId(10), lineup.slots, "oop");
    expect(targets).toContain(freeSpotId({ row: 2, col: 1 }));
    expect(targets).toContain(slotId(5));
    expect(targets).not.toContain(freeSpotId({ row: 3, col: 1 }));
  });
});

it("a carried card shows the role it would take where it lands", () => {
  const { slots } = lineup;
  expect(landingShape(slots, 6, "ip", freeSpotId({ row: 4, col: 3 })).ip).toEqual({
    position: "DM",
    side: "C",
    roleId: "ip:4",
  });
  expect(landingShape(slots, 6, "ip", slotId(10))).toBe(slots[10]);
  expect(landingShape(slots, 6, "ip", OFF_PITCH)).toBe(slots[6]);
  expect(landingShape(slots, 6, "ip", null)).toBe(slots[6]);
  expect(landingShape(slots, 0, "ip", freeSpotId({ row: 4, col: 3 }))).toBe(slots[0]);
});

it("a position fits from rating 15", () => {
  const pos = (st: number) => POS_NAMES.map((name) => (name === "ST" ? st : 1));
  expect(fitOf(pos(15), "ST")).toEqual({ good: true, rating: 15 });
  expect(fitOf(pos(14), "ST")).toEqual({ good: false, rating: 14 });
  expect(fitOf(pos(20), "AMC")).toEqual({ good: false, rating: 1 });
  expect(fitOf([], "GK")).toEqual({ good: false, rating: 0 });
});
