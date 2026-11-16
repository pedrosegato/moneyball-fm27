import { analyzeFixture, demoPlayers } from "../fixtures";
import { columnPresetFor, defaultColumnsFor, IDENTITY_DEFAULTS } from "../presets";
import { buildColumns } from "./build";
import { visibleColumnIds } from "./visibility";

describe("visibleColumnIds", () => {
  const columns = buildColumns(analyzeFixture(demoPlayers(3)));

  it("drops saved columns the catalog no longer has", () => {
    const ids = visibleColumnIds(columns, { group: "ATA", presets: { ATA: ["age", "gone/90", "G/90"] }, groups: [] });
    expect(ids).toEqual(["name", "age", "G/90"]);
  });

  it("column groups show the name, the player's facts, the page's fixed columns and those groups in chip order", () => {
    const of = (group: string) => columns.filter((c) => c.group === group).map((c) => c.id);
    const edited = { ATA: ["G/90", "Drb/90", "age"] };
    const ids = visibleColumnIds(columns, {
      group: "ATA",
      presets: edited,
      groups: ["cruzamento", "desarmes"],
      fixed: ["fair"],
    });
    expect(ids).toEqual(["name", ...IDENTITY_DEFAULTS, "fair", ...of("cruzamento"), ...of("desarmes")]);
    const reversed = visibleColumnIds(columns, { group: "ATA", presets: edited, groups: ["desarmes", "cruzamento"] });
    expect(reversed).toEqual(["name", ...IDENTITY_DEFAULTS, ...of("cruzamento"), ...of("desarmes")]);
    expect(ids).not.toContain("Drb/90");
    expect(ids).not.toContain("perf-ATA");
  });

  it("with no group on, Geral shows the position's preset, the user's edits included", () => {
    expect(visibleColumnIds(columns, { group: "ATA", presets: {}, groups: [] })).toEqual([
      "name",
      ...defaultColumnsFor("ATA"),
    ]);
    const edited = { ATA: ["G/90", "Drb/90", "age"] };
    expect(visibleColumnIds(columns, { group: "ATA", presets: edited, groups: [] })).toEqual([
      "name",
      "G/90",
      "Drb/90",
      "age",
    ]);
  });

  it("puts a view's fixed columns right after the player's facts, each once", () => {
    const fixed = ["fair", "valueRatio", "perf", "statsVsAbility", "monthsLeft"];
    const ids = visibleColumnIds(columns, { group: "ATA", presets: {}, groups: [], fixed });
    const stats = columnPresetFor("ATA").filter((id) => id !== "perf");
    expect(ids).toEqual([
      "name",
      "value",
      "wage",
      "contract_end",
      "position",
      "age",
      "minutes",
      "rating",
      "division",
      ...fixed,
      ...stats,
    ]);
    const edited = visibleColumnIds(columns, { group: "ATA", presets: { ATA: ["G/90", "age"] }, groups: [], fixed });
    expect(edited).toEqual(["name", ...fixed, "G/90", "age"]);
  });

  it("drops a saved column that no longer exists, like the old Perf. aj.", () => {
    const ids = visibleColumnIds(columns, {
      group: null,
      presets: { ALL: ["G/90", "perfAdj", "perfAdj-ATA", "age"] },
      groups: [],
      lead: ["perf", "perfAdj"],
      fixed: ["perfAdj-GK"],
    });
    expect(ids).toEqual(["name", "perf", "G/90", "age"]);
  });
});
