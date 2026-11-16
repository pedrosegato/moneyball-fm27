import { stats } from "@/i18n/pt-BR/stats";
import { STATS } from "./catalog";

describe("stat catalog", () => {
  it("explains every stat in one plain sentence, for the header and stat-list tooltips", () => {
    const missing = STATS.filter((d) => !d.description?.trim()).map((d) => d.key);
    expect(missing).toEqual([]);
    for (const d of STATS) {
      expect(d.description.trim().replace(/\.$/, "")).not.toMatch(/\.\s/);
      expect(d.description).toMatch(/melhor|trabalho|fáceis/);
    }
  });

  it("says a lower-is-better stat is better lower", () => {
    for (const d of STATS.filter((s) => s.lowerIsBetter)) expect(d.description).toMatch(/menos, melhor/);
  });

  it("takes every label and description from the stats copy, which names no other stat", () => {
    expect(STATS.map((d) => d.key)).toEqual(Object.keys(stats.label));
    expect(STATS.map((d) => d.key)).toEqual(Object.keys(stats.description));
    const npxgOver = STATS.find((d) => d.key === "npG-npxG/90");
    expect(npxgOver).toMatchObject({ abbr: "npxG-OP/90", label: "Gols sem pênalti acima do npxG por 90" });
  });
});
