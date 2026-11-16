import { describe, expect, it } from "vitest";
import { FORMATIONS } from "@/engine/tacticalFit";
import { playerRecord } from "@/engine/testing/records";
import { slotNeeds } from "./needs";

const SLOTS = FORMATIONS["4-3-3"];
const POOL = 300;

function lineupOf(perfs: readonly (number | null)[], minutes: readonly number[] = []) {
  const filled = perfs.flatMap((p, s) => (p === null ? [] : [s]));
  const players = filled.map((s) => playerRecord({ name: `Jogador ${s}`, minutes: minutes[s] ?? 2000 }));
  const xi = perfs.map((p, s) => (p === null ? null : filled.indexOf(s)));
  const perfOfSlot = (slot: number) => perfs[slot] ?? Number.NaN;
  return { players, xi, perfOfSlot };
}

describe("slotNeeds", () => {
  it("lists empty slots first, then the weak ones worst first", () => {
    const perfs = SLOTS.map(() => 73 as number | null);
    perfs[6] = 31;
    perfs[4] = null;
    perfs[10] = 19;
    const { players, xi, perfOfSlot } = lineupOf(perfs);
    expect(slotNeeds(players, POOL, xi, perfOfSlot)).toEqual({
      needs: [
        { slot: 4, perf: null },
        { slot: 10, perf: 19 },
        { slot: 6, perf: 31 },
      ],
      noData: [],
    });
  });

  it("keeps players without enough minutes apart", () => {
    const perfs = SLOTS.map(() => 73 as number | null);
    perfs[1] = NaN;
    const minutes = SLOTS.map(() => 2000);
    minutes[1] = 180;
    const { players, xi, perfOfSlot } = lineupOf(perfs, minutes);
    expect(slotNeeds(players, POOL, xi, perfOfSlot)).toEqual({
      needs: [],
      noData: [{ slot: 1, minutes: 180 }],
    });
  });

  it("reads the XI it is given, so a slot filled by a drop is no longer empty", () => {
    const perfs = SLOTS.map(() => 73 as number | null);
    perfs[4] = null;
    const { players, xi, perfOfSlot } = lineupOf(perfs);
    const filledAtOnce = xi.map((i, s) => (s === 4 ? 0 : i));
    expect(slotNeeds(players, POOL, xi, perfOfSlot).needs).toEqual([{ slot: 4, perf: null }]);
    expect(slotNeeds(players, POOL, filledAtOnce, () => 73).needs).toEqual([]);
  });
});
