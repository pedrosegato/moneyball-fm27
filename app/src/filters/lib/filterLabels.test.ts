import type { FilterSpec } from "@/engine/universe";
import { buildColumns } from "@/table/columns/build";
import { analyzeFixture, demoPlayers } from "@/table/fixtures";
import { filterLabel } from "./filterLabels";
import { filterTargets } from "./targets";

const source = analyzeFixture(demoPlayers(30));
const columns = buildColumns(source);

describe("filterLabel", () => {
  const targets = filterTargets(columns);
  const label = (f: FilterSpec) => filterLabel(f, targets.get(f.col));

  it("reads a range as the comp's chips do", () => {
    expect(label({ col: "age", kind: "range", max: 23 })).toBe("Idade ≤ 23");
    expect(label({ col: "marketValue", kind: "range", max: 8_000_000 })).toBe("Valor ≤ £8,0M");
    expect(label({ col: "minutes", kind: "range", min: 900, max: 3000 })).toBe("Min 900–3.000");
    expect(label({ col: "G/90", kind: "range", min: 0.4 })).toBe("G/90 ≥ 0,40");
    expect(label({ col: "pct:G/90", kind: "range", min: 75 })).toBe("G/90 pct ≥ 75");
  });

  it("names one or two choices and counts more", () => {
    expect(label({ col: "division", kind: "set", values: ["Brasileirão Serie B Chevrolet"] })).toBe(
      "Liga: Brasileirão Serie B Chevrolet",
    );
    expect(label({ col: "foot", kind: "set", values: ["Left", "Either"] })).toBe("Pé: Esquerdo, Ambos");
    expect(label({ col: "division", kind: "set", values: Array.from({ length: 14 }, (_, k) => `L${k}`) })).toBe(
      "Liga: 14 selecionadas",
    );
    expect(label({ col: "club", kind: "set", values: ["A", "B", "C"] })).toBe("Clube: 3 selecionados");
    expect(label({ col: "club", kind: "set", values: [""] })).toBe("Clube: Sem clube");
  });

  it("reads contract dates in pt-BR", () => {
    expect(label({ col: "contract_end", kind: "dateRange", to: "2027-06-30" })).toBe("Contrato até 30/06/2027");
    expect(label({ col: "contract_end", kind: "dateRange", from: "2027-07-01" })).toBe(
      "Contrato a partir de 01/07/2027",
    );
  });

  it("falls back to the column id for a filter no column shows", () => {
    expect(filterLabel({ col: "rating", kind: "range", min: 7 }, undefined)).toBe("rating ≥ 7");
  });
});
