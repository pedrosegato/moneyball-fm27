import { buildColumns } from "@/table/columns/build";
import type { TableColumn } from "@/table/columns/types";
import { analyzeFixture, demoPlayers } from "@/table/fixtures";
import { filterTarget, filterTargets } from "./targets";

const source = analyzeFixture(demoPlayers(30));
const columns = buildColumns(source);
const column = (id: string): TableColumn => columns.find((c) => c.id === id)!;

describe("filterTarget", () => {
  it("filters the identity columns on the engine column that holds what the cell shows", () => {
    expect(filterTarget(column("age"), "value")).toMatchObject({ col: "age", kind: "range" });
    expect(filterTarget(column("value"), "value")).toMatchObject({ col: "marketValue", kind: "range" });
    expect(filterTarget(column("position"), "value")).toMatchObject({ col: "naturalPositions", kind: "set" });
    expect(filterTarget(column("division"), "value")).toMatchObject({ col: "division", kind: "set" });
    expect(filterTarget(column("contract_end"), "value")).toMatchObject({ col: "contract_end", kind: "dateRange" });
    expect(filterTarget(column("name"), "value")).toBeNull();
  });

  it("filters a stat on its value or on the percentile on show", () => {
    expect(filterTarget(column("G/90"), "value")).toMatchObject({ col: "G/90", percentile: false });
    expect(filterTarget(column("G/90"), "percentile")).toMatchObject({ col: "pct:G/90", percentile: true });
    expect(filterTarget(column("G/90"), "value")).not.toHaveProperty("pinnable");
  });

  it("filters scores and composites on their own columns", () => {
    expect(filterTarget(column("perf"), "percentile")).toMatchObject({ col: "perf", percentile: false });
    expect(filterTarget(column("actions-def"), "value")).toMatchObject({ col: "actions-def" });
    expect(filterTarget(column("actions-def"), "percentile")).toMatchObject({ col: "pct:actions-def" });
    expect(filterTarget(column("fair"), "value")).toMatchObject({ col: "fair" });
  });

  it("Performance filters as a range on perf", () => {
    expect(filterTarget(column("perf"), "percentile")).toMatchObject({ col: "perf", kind: "range" });
  });

  it("finds the column of a saved filter in either mode", () => {
    const targets = filterTargets(columns);
    expect(targets.get("pct:G/90")?.column.id).toBe("G/90");
    expect(targets.get("G/90")?.percentile).toBe(false);
    expect(targets.get("marketValue")?.column.id).toBe("value");
  });
});
