import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ENGINE_SETTINGS } from "./analysis/input";
import { NO_ROLE } from "./analysis/roles";
import { squadRolePerf } from "./analysis/squadRoles";
import { percentileColumn } from "./columnIds";
import { defaultActionsPresets } from "./composites";
import { leagueCoefficient, leagueStrengthIndex } from "./leagueStrength";
import { groupPercentiles, poolPercentiles } from "./percentiles";
import { POS_NAMES } from "./positions";
import { scoreRoles } from "./roles/score";
import { type AnalysisRequest, createEngineSession, type EngineRequest, type EngineResponse } from "./session";
import { deriveAll } from "./stats/derive";
import { playerRecord, snapshotOf } from "./testing/records";

vi.mock("./percentiles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./percentiles")>();
  return {
    ...actual,
    groupPercentiles: vi.fn(actual.groupPercentiles),
    poolPercentiles: vi.fn(actual.poolPercentiles),
  };
});
vi.mock("./leagueStrength", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./leagueStrength")>();
  return {
    ...actual,
    leagueStrengthIndex: vi.fn(actual.leagueStrengthIndex),
    leagueCoefficient: vi.fn(actual.leagueCoefficient),
  };
});
vi.mock("./roles/score", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./roles/score")>();
  return { ...actual, scoreRoles: vi.fn(actual.scoreRoles) };
});
vi.mock("./stats/derive", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./stats/derive")>();
  return { ...actual, deriveAll: vi.fn(actual.deriveAll) };
});

const ST = POS_NAMES.map((name) => (name === "ST" ? 20 : 1));
const range = (n: number, from = 1) => Array.from({ length: n }, (_, k) => from + k);
const list = (a: ArrayLike<number>) => Array.from(a);

const snapshot = snapshotOf(
  range(40).map((k) => playerRecord({ pos: ST, minutes: k % 2 ? 1000 : 500, season: { goals: k } })),
);
const detailed = (k: number) => {
  const { record: zero } = playerRecord();
  const record = Object.fromEntries(
    Object.keys(zero).map((key) => [key, 10 + ((k * 7) % 40)]),
  ) as unknown as typeof zero;
  return playerRecord({
    pos: ST,
    minutes: 1500,
    record,
    season: { goals: k, assists: (k * 3) % 11, motm: k % 4, clean_sheets: k % 5 },
  });
};
const roleSnapshot = snapshotOf(range(40).map(detailed));
const input: AnalysisRequest = {
  composites: defaultActionsPresets(),
  myClubUid: null,
  settings: DEFAULT_ENGINE_SETTINGS,
};

let nextId = 1;
const analyze = (extra: Partial<Extract<EngineRequest, { type: "analyze" }>> = {}): EngineRequest => ({
  id: nextId++,
  type: "analyze",
  snapshotId: 1,
  input,
  ...extra,
});
const filter = (filters: Extract<EngineRequest, { type: "filter" }>["filters"], snapshotId = 1): EngineRequest => ({
  id: nextId++,
  type: "filter",
  snapshotId,
  filters,
});

type Analyzed = Extract<EngineResponse, { type: "analyze"; ok: true }>;
type Filtered = Extract<EngineResponse, { type: "filter"; ok: true }>;

function analyzed(response: EngineResponse): Analyzed {
  if (!response.ok || response.type !== "analyze") throw new Error(`no analysis: ${JSON.stringify(response)}`);
  return response;
}

function filtered(response: EngineResponse): Filtered {
  if (!response.ok || response.type !== "filter") throw new Error(`no mask: ${JSON.stringify(response)}`);
  return response;
}

const ranks = () => vi.mocked(groupPercentiles).mock.calls.length;
const poolRanks = () => vi.mocked(poolPercentiles).mock.calls.length;
const derives = () => vi.mocked(deriveAll).mock.calls.length;
const leagueIndexes = () => vi.mocked(leagueStrengthIndex).mock.calls.length;
const leagueFits = () => vi.mocked(leagueCoefficient).mock.calls.length;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("engine session", () => {
  it("sends Perf. função for the best role, then for a picked role", () => {
    const session = createEngineSession();
    const best = analyzed(session.handle(analyze({ snapshot: roleSnapshot })).response).analysis;
    expect(best.roleChoice).toBeNull();
    expect(list(best.roleShown).some((k) => k !== NO_ROLE)).toBe(true);
    const picked = analyzed(session.handle(analyze({ input: { ...input, role: "ip:10" } })).response).analysis;
    expect(picked.roleChoice).toBe("ip:10");
    expect(new Set(picked.roleShown).size).toBe(1);
    expect(list(picked.rolePerf)).not.toEqual(list(best.rolePerf));
  });

  it("sends every role's score for the club's players, equal to Perf. função of a picked role", () => {
    const squadSnapshot = snapshotOf(
      range(40, 0).map((k) => (k < 10 ? { ...detailed(k), club_uid: 42 } : detailed(k))),
    );
    const session = createEngineSession();
    const mine = { ...input, myClubUid: 42, role: "ip:10" } as const;
    const { analysis } = analyzed(session.handle(analyze({ snapshot: squadSnapshot, input: mine })).response);
    expect(list(analysis.squadRoles.players)).toEqual(range(10, 0));
    const perf = squadRolePerf(analysis.squadRoles);
    const pooled = range(10, 0).filter((i) => analysis.pool[i]);
    expect(pooled.length).toBeGreaterThan(0);
    for (const i of pooled) expect(perf(i, "ip:10")).toBe(analysis.rolePerf[i]);
    const scored = vi.mocked(scoreRoles).mock.calls.length;
    analyzed(session.handle(analyze({ input: { ...mine, role: "ip:18" } })).response);
    expect(vi.mocked(scoreRoles).mock.calls.length).toBe(scored);
    expect(scored).toBe(1);
  });

  it("a filter on Performance follows the picked role", () => {
    const session = createEngineSession();
    analyzed(session.handle(analyze({ snapshot: roleSnapshot })).response);
    for (const role of ["ip:10", "ip:18"] as const) {
      const { analysis } = analyzed(session.handle(analyze({ input: { ...input, role } })).response);
      const { mask } = filtered(session.handle(filter([{ col: "perf", kind: "range", min: 60 }])).response);
      const expected = list(analysis.rolePerf).map((v, i) => (v >= 60 && analysis.pool[i] ? 1 : 0));
      expect(expected.some(Boolean)).toBe(true);
      expect(list(mask)).toEqual(expected);
    }
  });

  it("picking a role reuses the role cache", () => {
    const session = createEngineSession();
    analyzed(session.handle(analyze({ snapshot: roleSnapshot })).response);
    const scored = vi.mocked(scoreRoles).mock.calls.length;
    analyzed(session.handle(analyze({ input: { ...input, role: "ip:10" } })).response);
    analyzed(session.handle(analyze({ input: { ...input, role: "ip:18" } })).response);
    expect(vi.mocked(scoreRoles).mock.calls.length).toBe(scored);
    expect(scored).toBe(1);
  });

  it("filter-only change does not recompute percentiles", () => {
    const session = createEngineSession();
    analyzed(session.handle(analyze({ snapshot })).response);
    const ranked = ranks();
    expect(ranked).toBeGreaterThan(0);
    const { response, transfer } = session.handle(filter([{ col: "minutes", kind: "range", min: 900 }]));
    const { mask } = filtered(response);
    expect(ranks()).toBe(ranked);
    expect(list(mask)).toEqual(range(40).map((k) => k % 2));
    expect(transfer).toEqual([mask.buffer]);
  });

  it("answers the same request again from its stages, and sends the snapshot's own columns only once", () => {
    const session = createEngineSession();
    const first = analyzed(session.handle(analyze({ snapshot })).response);
    const [ranked, pooled] = [ranks(), poolRanks()];
    expect([ranked, pooled]).toEqual([2, 1]);
    const again = analyzed(session.handle(analyze()).response);
    expect([derives(), ranks(), poolRanks()]).toEqual([1, ranked, pooled]);
    expect(list(again.analysis.pct["G/90"])).toEqual(list(first.analysis.pct["G/90"]));
    expect(again.snapshot).toBeUndefined();
  });

  it("a threshold keeps every percentile; poolMinutes ranks the display and the model again, composites the display", () => {
    const session = createEngineSession();
    analyzed(session.handle(analyze({ snapshot })).response);
    const [ranked, pooled] = [ranks(), poolRanks()];
    const moneyball = { ...DEFAULT_ENGINE_SETTINGS.moneyball, minRatio: 3 };
    analyzed(
      session.handle(analyze({ input: { ...input, settings: { ...DEFAULT_ENGINE_SETTINGS, moneyball } } })).response,
    );
    expect([ranks(), poolRanks()]).toEqual([ranked, pooled]);
    const settings = { ...DEFAULT_ENGINE_SETTINGS, poolMinutes: 900 };
    const strict = analyzed(session.handle(analyze({ input: { ...input, settings } })).response);
    expect([ranks(), poolRanks()]).toEqual([2 * ranked, 2 * pooled]);

    expect([Number.isNaN(strict.analysis.pct["G/90"][0]), Number.isNaN(strict.analysis.pct["G/90"][1])]).toEqual([
      false,
      true,
    ]);
    expect(list(strict.analysis.pool)).toEqual(range(40).map((k) => k % 2));
    analyzed(session.handle(analyze({ input: { ...input, settings, composites: [] } })).response);
    expect([ranks(), poolRanks()]).toEqual([3 * ranked, 2 * pooled]);
  });

  it("rates the leagues once per snapshot and fits the league coefficient with the model: a threshold keeps it", () => {
    const session = createEngineSession();
    const first = analyzed(session.handle(analyze({ snapshot })).response);
    expect([leagueIndexes(), leagueFits()]).toEqual([1, 1]);
    expect(first.snapshot?.leagueStrength).toHaveLength(40);
    expect(first.analysis.perfIn.ATA).toHaveLength(40);
    const moneyball = { ...DEFAULT_ENGINE_SETTINGS.moneyball, minRatio: 3 };
    analyzed(
      session.handle(analyze({ input: { ...input, settings: { ...DEFAULT_ENGINE_SETTINGS, moneyball } } })).response,
    );
    expect([leagueIndexes(), leagueFits()]).toEqual([1, 1]);
    analyzed(
      session.handle(analyze({ input: { ...input, settings: { ...DEFAULT_ENGINE_SETTINGS, poolMinutes: 900 } } }))
        .response,
    );
    expect([leagueIndexes(), leagueFits()]).toEqual([1, 2]);
  });

  it("answers for a snapshot it does not hold with a failure naming the one it holds", () => {
    const session = createEngineSession();
    expect(session.handle(analyze()).response).toMatchObject({
      ok: false,
      loaded: null,
      error: "snapshot 1 is not loaded",
    });
    analyzed(session.handle(analyze({ snapshot })).response);
    expect(session.handle(filter([], 2)).response).toMatchObject({ ok: false, loaded: 1 });
    const bad = { ...input, composites: [{ id: "x", label: "x", kind: "weightedSum" as const, weights: { nope: 1 } }] };
    expect(session.handle(analyze({ input: bad })).response).toMatchObject({
      ok: false,
      loaded: 1,
      error: expect.stringMatching(/nope/),
    });
    filtered(session.handle(filter([])).response);
  });

  it("a failed analysis leaves its stages uncommitted, so filters stay on the last analysis that succeeded", () => {
    const session = createEngineSession();
    analyzed(session.handle(analyze({ snapshot })).response);
    const top = [{ col: percentileColumn("G/90"), kind: "range" as const, min: 90 }];
    const before = list(filtered(session.handle(filter(top)).response).mask);
    const settings = { ...DEFAULT_ENGINE_SETTINGS, poolMinutes: 900 };
    const broken = [
      ...input.composites,
      { id: "broken", label: "Broken", kind: "percentileMean" as const, weights: { nope: 1 } },
    ];
    const failed = session.handle(analyze({ input: { ...input, settings, composites: broken } })).response;
    expect(failed).toMatchObject({ ok: false, error: expect.stringMatching(/nope/) });
    expect(list(filtered(session.handle(filter(top)).response).mask)).toEqual(before);
    analyzed(session.handle(analyze({ input: { ...input, settings } })).response);
    expect(list(filtered(session.handle(filter(top)).response).mask)).not.toEqual(before);
  });

  it("sends the snapshot's columns with its first analysis that succeeds", () => {
    const session = createEngineSession();
    const bad = { ...input, composites: [{ id: "x", label: "x", kind: "weightedSum" as const, weights: { nope: 1 } }] };
    expect(session.handle(analyze({ snapshot, input: bad })).response).toMatchObject({ ok: false, loaded: 1 });
    expect(analyzed(session.handle(analyze()).response).snapshot?.uids).toHaveLength(40);
    expect(analyzed(session.handle(analyze()).response).snapshot).toBeUndefined();
  });

  it("hands over copies, so its cached columns survive the transfer", () => {
    const session = createEngineSession();
    const first = session.handle(analyze({ snapshot }));
    const response = analyzed(structuredClone(first.response, { transfer: first.transfer }));
    expect(first.transfer.length).toBeGreaterThan(100);
    expect(list(response.snapshot!.cols["G/90"]).slice(0, 2)).toEqual([0.09, 0.36]);
    const again = analyzed(
      session.handle(analyze({ input: { ...input, settings: { ...DEFAULT_ENGINE_SETTINGS } } })).response,
    );
    expect(list(again.analysis.pct["G/90"])).toEqual(list(response.analysis.pct["G/90"]));
    const { mask } = filtered(session.handle(filter([{ col: "G/90", kind: "range", min: 0.3 }])).response);
    expect(list(mask).slice(0, 2)).toEqual([0, 1]);
  });
});
