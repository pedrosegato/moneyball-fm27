import { describe, expect, it } from "vitest";
import { FORMATIONS } from "@/engine/tacticalFit";
import { carriedOver, clearSlot, frozenPicks, namesEverySlot, placePlayer, swapSlots } from "./lineupEdits";

describe("lineup edits", () => {
  it("frozen picks hold the whole XI on screen", () => {
    const picks = frozenPicks([10, null, 30]);
    expect(Object.keys(picks)).toHaveLength(11);
    expect(picks).toMatchObject({ "0": 10, "1": null, "2": 30, "10": null });
  });

  it("placing a player already in the XI swaps the two slots", () => {
    expect(placePlayer({ "0": 10, "1": 20 }, 0, 20)).toEqual({ "0": 20, "1": 10 });
  });

  it("placing a bench player replaces the slot's player", () => {
    expect(placePlayer({ "0": 10 }, 0, 99)).toEqual({ "0": 99 });
  });

  it("clearing a slot keeps it empty on purpose", () => {
    expect(clearSlot({ "3": 40 }, 3)).toEqual({ "3": null });
  });

  it("swapping two slots exchanges their players", () => {
    expect(swapSlots({ "0": 10, "1": null }, 0, 1)).toEqual({ "0": null, "1": 10 });
  });

  it("frozen picks name every slot, so the engine fills none of them", () => {
    expect(namesEverySlot(frozenPicks([10]), 11)).toBe(true);
    expect(namesEverySlot({ "0": 10, "1": null }, 11)).toBe(false);
  });

  it("while the engine works on a new formation, each player stays on a slot of his own position", () => {
    const before = { slots: FORMATIONS["4-3-3"], xi: [0, null, 2, 3, null, 5, null, null, null, null, 10] };
    expect(carriedOver(before, FORMATIONS["4-4-2"])).toEqual([0, null, 2, 3, null, null, null, null, null, 10, null]);
  });
});
