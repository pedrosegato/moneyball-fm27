import type { PlayerRecord } from "@/data/types";
import type { AnalysisResult } from "@/engine/index";
import { ROLES, roleIndex } from "@/engine/roles/catalog";
import { chip } from "@/table/columns/factories";
import type { ChipColumn, CustomColumn } from "@/table/columns/types";
import { customColumn } from "@/table/lib/customColumn";
import { slotColumns } from "./slotColumns";

const perfIn = {
  ATA: Float32Array.from([70, 40, 55, 20]),
  VOL: Float32Array.from([30, 62, 48, 10]),
};
const players = [
  { uid: 10, position: "ST (C)" },
  { uid: 11, position: "GK" },
  { uid: 12, position: "DM, MC" },
  { uid: 13, position: "GK" },
] as PlayerRecord[];
const squadRoles = {
  players: Int32Array.from([0, 1, 2, 3]),
  perf: new Float32Array(4 * ROLES.length).fill(Number.NaN),
};
squadRoles.perf[2 * ROLES.length + roleIndex("ip:5")] = 66;
squadRoles.perf[0 * ROLES.length + roleIndex("ip:5")] = 12;
const pool = Uint8Array.from([1, 1, 1, 1]);
const analysis = {
  perf: Float32Array.from([70, 40, 55, 20]),
  perfIn,
  squadRoles,
  pool,
} as unknown as AnalysisResult;
const general = chip(
  {
    id: "perf",
    abbr: "Perf.",
    def: { label: "Performance", unit: "score", description: "geral" },
    group: "compostas",
    value: Float32Array.from([1, 2, 3, 4]),
    pct: Float32Array.from([1, 2, 3, 4]),
  },
  pool,
);
const roleName = customColumn({
  id: "perfRole",
  abbr: "Função",
  label: "Função",
  description: "",
  width: 100,
  align: "start",
  sortKey: () => [],
  exports: [],
  render: () => null,
});
const slots = ["ST(C)", "DM"];
const xi = [0, null, null, null];
const xiSlotOf = (i: number) => xi[i];

const columns = (slot: number, bench: readonly number[] = [], slotRole: string | null = null) =>
  slotColumns([general, roleName], { analysis, players, slot, xiSlotOf, slots, slotRole, bench });
const performance = (slot: number, slotRole: string | null = null) =>
  columns(slot, [], slotRole).find((c) => c.id === "perf") as ChipColumn;

describe("the squad's slot columns", () => {
  it("Performance is the player's score in the slot's role, for the whole squad, and the Função column goes away", () => {
    const col = performance(1, "ip:5");
    expect(col.value[2]).toBe(66);
    expect(col.value[0]).toBe(12);
    expect(col.value[3]).toBeNaN();
    expect(col.local).toBe(true);
    expect(columns(1, [], "ip:5").some((c) => c.id === "perfRole" || c.id === "slotPerf")).toBe(false);
  });

  it("without a slot role, Performance reads the player's best role in the slot's group", () => {
    expect(performance(1).value[2]).toBe(perfIn.VOL[2]);
    expect(performance(0).value[0]).toBe(perfIn.ATA[0]);
  });

  it("Escalado names the slot a player holds", () => {
    const col = columns(0).find((c) => c.id === "xiSlot") as CustomColumn;
    expect(col.exports[0].get(0, "value")).toBe("ST");
    expect(col.exports[0].get(1, "value")).toBeNull();
  });

  it("Escalado says Suplente for the game's bench and sorts the XI, then the bench in its order, then the rest", () => {
    const col = columns(0, [13, 11]).find((c) => c.id === "xiSlot") as CustomColumn;
    expect(col.render(1, false)).toBe("Suplente");
    expect(col.exports[0].get(3, "value")).toBe("Suplente");
    expect(col.render(2, false)).toBe("");
    expect(Array.from(col.sortKey("value"))).toEqual([0, slots.length + 1, Number.NaN, slots.length]);
  });
});
