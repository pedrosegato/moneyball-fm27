import { beforeAll, describe, expect, it } from "vitest";
import type { Snapshot } from "@/data/types";
import { type AnalysisInput, DEFAULT_ENGINE_SETTINGS, type EngineSettings } from "./analysis/input";
import { defaultActionsPresets } from "./composites";
import { runAnalysis } from "./index";
import type { RoleId } from "./roles/catalog";
import { type AnalysisRequest, createEngineSession, type EngineResponse } from "./session";
import { loadRawSnapshot, missingRawSnapshot } from "./testing/oldEngine";

const FULL_MS = 2500;
const DISPLAY_MS = 1000;
const FILTER_MS = 100;
const ROLE_PICK_MS = 1000;
const SESSION_TEST_MS = 60_000;

function samples<T>(runs: readonly (() => T)[]): { ms: number[]; best: number; last: T } {
  const ms: number[] = [];
  let last!: T;
  for (const run of runs) {
    const start = performance.now();
    last = run();
    ms.push(performance.now() - start);
  }
  return { ms, best: Math.min(...ms), last };
}

const shown = ({ ms, best }: { ms: number[]; best: number }) =>
  `best ${best.toFixed(0)} ms (${ms.map((t) => t.toFixed(0)).join(" / ")})`;

describe.skipIf(missingRawSnapshot("engine bench"))("engine timings on the fixture", () => {
  let snapshot: Snapshot;
  let input: AnalysisInput;

  beforeAll(() => {
    snapshot = loadRawSnapshot();
    input = {
      snapshot,
      composites: defaultActionsPresets(),
      myClubUid: snapshot.my_clubs[0].uid,
      settings: DEFAULT_ENGINE_SETTINGS,
    };
  }, 120_000);

  it(
    "full analysis under 2500 ms in Node on the Mac",
    () => {
      const full = samples([0, 1, 2].map(() => () => runAnalysis(input)));
      console.info(
        `runAnalysis on ${snapshot.players.length} players: cold ${full.ms[0].toFixed(0)} ms, ${shown(full)}`,
      );
      expect(full.last.uids).toHaveLength(snapshot.players.length);
      expect(full.best).toBeLessThan(FULL_MS);
    },
    SESSION_TEST_MS,
  );

  it(
    "through the worker session: composites, threshold and poolMinutes changes, and a filter",
    () => {
      const session = createEngineSession();
      const { snapshot: _, ...request } = input;
      let id = 0;
      const analyze =
        (req: AnalysisRequest, withSnapshot = false) =>
        () => {
          const { response } = session.handle({
            id: ++id,
            type: "analyze",
            snapshotId: 1,
            input: req,
            snapshot: withSnapshot ? snapshot : undefined,
          });
          expect(response.ok).toBe(true);
          return response;
        };
      const tuned = (settings: Partial<EngineSettings>) => ({
        ...request,
        settings: { ...DEFAULT_ENGINE_SETTINGS, ...settings },
      });
      const moneyball = (minRatio: number) => ({ ...DEFAULT_ENGINE_SETTINGS.moneyball, minRatio });

      const load = samples([analyze(request, true)]);
      const display = samples(
        [1, 2, 3].map((dropped) => analyze({ ...request, composites: request.composites.slice(dropped) })),
      );
      const threshold = samples([3, 2.5, 3.5].map((r) => analyze(tuned({ moneyball: moneyball(r) }))));
      const pool = samples([450, 600, 300].map((p) => analyze(tuned({ moneyball: moneyball(3.5), poolMinutes: p }))));
      const filter = samples(
        [0, 1, 2].map(
          () => (): EngineResponse =>
            session.handle({
              id: ++id,
              type: "filter",
              snapshotId: 1,
              filters: [
                { col: "minutes", kind: "range", min: 900, max: 3000 },
                { col: "value", kind: "range", max: 2_000_000 },
              ],
            }).response,
        ),
      );
      const clone = samples([() => structuredClone(snapshot)]);
      console.info(
        `session: snapshot + analysis ${load.ms[0].toFixed(0)} ms; composites change ${shown(display)}; ` +
          `threshold change ${shown(threshold)}; poolMinutes change ${shown(pool)}; filter ${shown(filter)}; ` +
          `structured clone of the snapshot (the UI thread's cost to post it) ${clone.ms[0].toFixed(0)} ms`,
      );
      expect(filter.last.ok).toBe(true);
      expect(clone.last.players).toHaveLength(snapshot.players.length);
      expect(display.best).toBeLessThan(DISPLAY_MS);
      expect(filter.best).toBeLessThan(FILTER_MS);
    },
    SESSION_TEST_MS,
  );

  it(
    "picking a role through the session stays under 1000 ms",
    () => {
      const session = createEngineSession();
      const { snapshot: _, ...request } = input;
      let id = 0;
      const analyze =
        (role: RoleId | null, withSnapshot = false) =>
        () => {
          const { response } = session.handle({
            id: ++id,
            type: "analyze",
            snapshotId: 1,
            input: { ...request, role },
            snapshot: withSnapshot ? snapshot : undefined,
          });
          expect(response.ok).toBe(true);
          return response;
        };
      const load = samples([analyze(null, true)]);
      const pick = samples((["ip:29", "oop:6", "ip:4", "oop:17"] as const).map((role) => analyze(role)));
      console.info(`role pick through the session: load ${load.ms[0].toFixed(0)} ms, then ${shown(pick)}`);
      expect(pick.best).toBeLessThan(ROLE_PICK_MS);
    },
    SESSION_TEST_MS,
  );
});
