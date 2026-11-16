import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_ENGINE_SETTINGS } from "@/engine/analysis/input";
import { runAnalysis } from "@/engine/index";
import { loadRawSnapshot, missingRawSnapshot } from "@/engine/testing/oldEngine";
import { defaultComposites, engineComposites } from "@/store/composites";
import { buildColumns } from "./columns/build";
import { sortRows } from "./columns/sort";
import type { TableColumn, TableSource } from "./columns/types";
import { toCsv } from "./lib/csv";
import { defaultColumnsFor } from "./presets";

const SORT_MS = 50;

function best(run: () => unknown, times = 5): { best: number; ms: number[] } {
  const ms: number[] = [];
  for (let k = 0; k < times; k++) {
    const start = performance.now();
    run();
    ms.push(performance.now() - start);
  }
  return { best: Math.min(...ms), ms };
}

const shown = ({ best: b, ms }: { best: number; ms: number[] }) =>
  `best ${b.toFixed(1)} ms (${ms.map((t) => t.toFixed(1)).join(" / ")})`;

describe.skipIf(missingRawSnapshot("table bench"))("table timings on the fixture", () => {
  let source: TableSource;
  let columns: TableColumn[];
  let rows: Uint32Array;
  const column = (id: string) => columns.find((c) => c.id === id)!;

  beforeAll(() => {
    const snapshot = loadRawSnapshot();
    const composites = engineComposites(defaultComposites());
    const analysis = runAnalysis({ snapshot, composites, myClubUid: null, settings: DEFAULT_ENGINE_SETTINGS });
    source = { players: snapshot.players, analysis, composites };
    columns = buildColumns(source);
    rows = Uint32Array.from(snapshot.players.keys());
  }, 120_000);

  it(`sorts every player on a stat, a score or a number column under ${SORT_MS} ms`, () => {
    for (const [id, mode] of [
      ["npxG/90", "value"],
      ["npxG/90", "percentile"],
      ["perf", "value"],
      ["value", "value"],
    ] as const) {
      const key = column(id).sortKey(mode);
      const timing = best(() => sortRows(rows, key, true));
      console.info(`sort ${rows.length} rows by ${id} (${mode}): ${shown(timing)}`);
      expect(timing.best).toBeLessThan(SORT_MS);
    }
  });

  it("collates names once, then sorts them like numbers", () => {
    const name = column("name");
    const first = best(() => name.sortKey("value"), 1);
    const again = best(() => sortRows(rows, name.sortKey("value"), false));
    console.info(`name rank, first use: ${shown(first)}; sort after: ${shown(again)}`);
    expect(again.best).toBeLessThan(SORT_MS);
  });

  it("builds the columns and exports the ATA view as CSV", () => {
    const cold = best(() => buildColumns({ ...source, players: [...source.players] }), 1);
    const build = best(() => buildColumns(source), 3);
    const ids = ["name", ...defaultColumnsFor("ATA")];
    const view = ids.map(column);
    const csv = best(() => toCsv(rows, view, "value"), 3);
    console.info(
      `buildColumns, new snapshot: ${shown(cold)}; same snapshot: ${shown(build)}; CSV of ${rows.length} rows × ${ids.length} columns: ${shown(csv)}`,
    );
  });
});
