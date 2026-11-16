import { slotCode } from "@/engine/positions";
import { type FitRow, FORMATIONS, fitVerdict } from "@/engine/tacticalFit";
import { shapeFromFormation } from "@/engine/tacticShape";
import { countVerdicts, fitColumns } from "./fitRows";
import { layoutSpots } from "./pitchView";
import { PITCH_COLUMNS, PITCH_ROWS, readingOrder, slotName } from "./slots";

const row = (index: number, perf: number, diff: number, style = 70): FitRow => ({
  index,
  perf,
  diff,
  style,
  verdict: fitVerdict(diff, 8),
});

describe("formation slots", () => {
  it("are named as the pitch map names the positions", () => {
    expect(["GK", "D(L)", "D(C)", "WB(R)", "DM", "M(C)", "AM(L)", "AM(C)", "ST(C)"].map(slotCode)).toEqual([
      "GK",
      "DL",
      "DC",
      "WBR",
      "DM",
      "MC",
      "AML",
      "AMC",
      "ST",
    ]);
    expect(slotName("D(C)")).toBe("Zagueiro (DC)");
    expect(slotName("ST(C)")).toBe("Atacante (ST)");
  });
});

const pitchSpots = (formation: string) => layoutSpots(shapeFromFormation(formation), "ip");
const spotsOf = (formation: string) => pitchSpots(formation).map(({ row, col }) => [row, col]);

describe("the vertical pitch", () => {
  it("puts the keeper at the bottom and the attack at the top, both in the middle lane", () => {
    const spots = spotsOf("4-3-3");
    const slots = FORMATIONS["4-3-3"];
    expect(spots[slots.indexOf("GK")]).toEqual([PITCH_ROWS, 3]);
    expect(spots[slots.indexOf("ST(C)")]).toEqual([1, 3]);
    expect(PITCH_COLUMNS).toBe(5);
  });

  it("keeps the wide slots on the flanks and spreads a line's centre between them, in the formation's order", () => {
    expect(spotsOf("4-4-2")).toEqual([
      [6, 3],
      [5, 1],
      [5, 2],
      [5, 4],
      [5, 5],
      [3, 1],
      [3, 2],
      [3, 4],
      [3, 5],
      [1, 2],
      [1, 4],
    ]);
    expect(spotsOf("3-5-2")).toEqual([
      [6, 3],
      [5, 2],
      [5, 3],
      [5, 4],
      [4, 1],
      [4, 3],
      [3, 2],
      [3, 4],
      [4, 5],
      [1, 2],
      [1, 4],
    ]);
  });

  it("holds each line at its own height, so a formation without it leaves the gap, as FM draws it", () => {
    const rowOf = (formation: string, slot: string) => spotsOf(formation)[FORMATIONS[formation].indexOf(slot)][0];
    expect(rowOf("4-2-3-1", "AM(C)")).toBe(2);
    expect(rowOf("4-3-3", "AM(L)")).toBe(2);
    expect(rowOf("4-2-3-1", "DM")).toBe(4);
    expect(rowOf("4-1-4-1", "M(C)")).toBe(3);
    expect(new Set(spotsOf("4-4-2").map(([row]) => row))).toEqual(new Set([1, 3, 5, 6]));
  });

  it("gives every slot of every formation a cell of its own, inside the pitch", () => {
    for (const [name, slots] of Object.entries(FORMATIONS)) {
      const spots = pitchSpots(name);
      expect(new Set(spots.map(({ row, col }) => `${row},${col}`)).size, name).toBe(slots.length);
      for (const { row, col } of spots) {
        expect(row).toBeGreaterThanOrEqual(1);
        expect(row).toBeLessThanOrEqual(PITCH_ROWS);
        expect(col).toBeGreaterThanOrEqual(1);
        expect(col).toBeLessThanOrEqual(PITCH_COLUMNS);
      }
    }
  });

  it("orders the slots as they are read, top to bottom and left to right, for the arrow keys", () => {
    const slots = FORMATIONS["4-2-3-1"];
    expect(readingOrder(pitchSpots("4-2-3-1")).map((s) => slots[s])).toEqual([
      "ST(C)",
      "AM(L)",
      "AM(C)",
      "AM(R)",
      "DM",
      "DM",
      "D(L)",
      "D(C)",
      "D(C)",
      "D(R)",
      "GK",
    ]);
  });
});

describe("Tactical fit rows", () => {
  it("counts the verdicts again for another margin, without the engine", () => {
    const rows = [row(0, 80, 20), row(1, 70, 9), row(2, 62, 1), row(3, 55, -6), row(4, 40, -21)];
    expect(countVerdicts(rows, 8)).toEqual({ upgrade: 2, replacement: 2, downgrade: 1 });
    expect(countVerdicts(rows, 10)).toEqual({ upgrade: 1, replacement: 3, downgrade: 1 });
    expect(countVerdicts(rows, 0)).toEqual({ upgrade: 3, replacement: 0, downgrade: 2 });
    expect(countVerdicts([row(0, 80, Number.NaN)], 8)).toEqual({ upgrade: 0, replacement: 0, downgrade: 0 });
  });

  it("spreads each candidate's numbers over the player index, blank for everyone else", () => {
    const rows = [row(3, 80, 12, 75), row(1, 61, -7, 66)];
    const ability = [10, 14, 9, 15.5];
    const cols = fitColumns(4, rows, (i) => ability[i], 13);
    expect([...cols.order]).toEqual([NaN, 1, NaN, 0]);
    expect([...cols.perf]).toEqual([NaN, 61, NaN, 80]);
    expect([...cols.diff]).toEqual([NaN, -7, NaN, 12]);
    expect([...cols.style]).toEqual([NaN, 66, NaN, 75]);
    expect([...cols.ability]).toEqual([NaN, 14, NaN, 15.5]);
    expect([...cols.abilityDiff]).toEqual([NaN, 1, NaN, 2.5]);
    expect([...cols.rows]).toEqual([3, 1]);
    expect([...fitColumns(4, rows, (i) => ability[i], Number.NaN).abilityDiff]).toEqual([NaN, NaN, NaN, NaN]);
  });

  it("ranks each candidate's slot ability among the candidates and your player, so its chip has a tier", () => {
    const rows = Array.from({ length: 25 }, (_, k) => row(k, 50, 0));
    const cols = fitColumns(26, rows, (i) => i + 1, 13);
    expect(cols.abilityPct[24]).toBe(96);
    expect(cols.abilityPct[0]).toBe(3);
    expect(cols.abilityPctDiff[24]).toBe(46);
    expect(cols.abilityPctDiff[0]).toBe(-47);
    expect(cols.abilityPct[25]).toBeNaN();
    expect([...fitColumns(26, rows, (i) => i + 1, Number.NaN).abilityPctDiff].every(Number.isNaN)).toBe(true);
  });

  it("leaves the slot ability uncoloured when fewer than 20 players rank it", () => {
    const rows = Array.from({ length: 10 }, (_, k) => row(k, 50, 0));
    const cols = fitColumns(10, rows, (i) => i + 1, 5);
    expect([...cols.abilityPct].every(Number.isNaN)).toBe(true);
  });
});
