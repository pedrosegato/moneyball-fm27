import { describe, expect, it } from "vitest";
import { analysisColumns } from "./analysis/columns";
import { analyzeDisplay } from "./analysis/display";
import { DEFAULT_ENGINE_SETTINGS } from "./analysis/input";
import { analyzeModel } from "./analysis/model";
import { prepareSnapshot } from "./analysis/prepare";
import { viewRoles } from "./analysis/roles";
import { scorePlayers } from "./analysis/score";
import { analysisColumnIds, knownFilter, snapshotColumnIds } from "./columnIds";
import { defaultActionsPresets } from "./composites";
import { playerRecord, snapshotOf } from "./testing/records";

const sorted = (ids: Iterable<string>) => [...ids].sort();

describe("column ids", () => {
  const prepared = prepareSnapshot(snapshotOf([playerRecord(), playerRecord({ minutes: 0 })]));

  it("snapshotColumnIds lists exactly the columns prepareSnapshot builds", () => {
    expect(sorted(snapshotColumnIds())).toEqual(sorted(Object.keys(prepared.columns)));
  });

  it("analysisColumnIds lists exactly the columns analysisColumns builds", () => {
    const composites = defaultActionsPresets();
    const { poolMinutes } = DEFAULT_ENGINE_SETTINGS;
    const display = analyzeDisplay(prepared, { poolMinutes, composites });
    const model = analyzeModel(prepared, { poolMinutes, leagueAdjustment: 1, myClubUid: null });
    const scores = scorePlayers(prepared, model, { myClubUid: null, settings: DEFAULT_ENGINE_SETTINGS });
    const roles = viewRoles(prepared.records, prepared.groups, model.roles, null);
    const built = analysisColumns(prepared, { ...display, ...scores, ...roles });
    expect(sorted(analysisColumnIds(composites.map((c) => c.id)))).toEqual(sorted(Object.keys(built)));
  });

  it("league strength is a snapshot column; there is no separate adjusted Performance column", () => {
    expect(snapshotColumnIds().has("leagueStrength")).toBe(true);
    const table = analysisColumnIds([]);
    for (const id of ["perfAdj", "perfAdj-ATA", "perfAdj-GK"]) {
      expect(snapshotColumnIds().has(id)).toBe(false);
      expect(table.has(id)).toBe(false);
    }
  });
});

describe("knownFilter", () => {
  const columns = snapshotColumnIds();

  it("accepts each filter kind on a known column", () => {
    expect(knownFilter({ col: "age", kind: "range", max: 23 }, columns)).not.toBeNull();
    expect(knownFilter({ col: "G/90", kind: "range", min: null, max: 0.5 }, columns)).not.toBeNull();
    expect(knownFilter({ col: "division", kind: "set", values: ["Série B"] }, columns)).not.toBeNull();
    expect(knownFilter({ col: "contract_end", kind: "dateRange", to: "2027-06-30" }, columns)).not.toBeNull();
  });

  it("rejects a column the catalog does not have", () => {
    expect(knownFilter({ col: "Gols/90", kind: "range", min: 1 }, columns)).toBeNull();
    expect(knownFilter({ col: "perf", kind: "range", min: 60 }, columns)).toBeNull();
  });

  it("drops a saved filter on the removed Perf. aj. column", () => {
    const withAnalysis = analysisColumnIds([]);
    expect(knownFilter({ col: "perfAdj", kind: "range", min: 60 }, withAnalysis)).toBeNull();
    expect(knownFilter({ col: "perfAdj-ATA", kind: "range", min: 60 }, withAnalysis)).toBeNull();
    expect(knownFilter({ col: "perf", kind: "range", min: 60 }, withAnalysis)).not.toBeNull();
  });

  it("rejects malformed filters", () => {
    for (const bad of [
      null,
      "age",
      [],
      { col: "age", kind: "between", min: 1 },
      { col: "age", kind: "range", min: "18" },
      { col: "age", kind: "range", min: Infinity },
      { col: "division", kind: "set", values: "Série B" },
      { col: "division", kind: "set", values: ["Série B", 3] },
      { col: "contract_end", kind: "dateRange", from: "amanhã" },
      { col: 3, kind: "range", min: 1 },
    ]) {
      expect(knownFilter(bad, columns), JSON.stringify(bad)).toBeNull();
    }
  });

  it("returns a copy without unknown keys", () => {
    const raw = { col: "age", kind: "range", min: 18, max: null, note: "<img src=x>", values: ["x"] };
    expect(knownFilter(raw, columns)).toEqual({ col: "age", kind: "range", min: 18 });
  });
});
