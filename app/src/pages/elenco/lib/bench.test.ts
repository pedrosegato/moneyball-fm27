import { describe, expect, it } from "vitest";
import { sampleTactic } from "@/engine/testing/tactic";
import { benchOf } from "./bench";

describe("benchOf", () => {
  it("keeps the game's subs in their order, minus anyone now in the XI", () => {
    const tactic = sampleTactic(undefined, [40, 41, 42, 43]);
    expect(benchOf(tactic, new Set([41, 7]))).toEqual([40, 42, 43]);
  });

  it("without a game tactic there is no bench", () => {
    expect(benchOf(null, new Set())).toEqual([]);
  });
});
