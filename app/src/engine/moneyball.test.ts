import { beforeAll, describe, expect, it } from "vitest";
import { marketValue } from "./club";
import { fairValues, fitValueModel } from "./fairValue";
import { DEFAULT_MONEYBALL_OPTIONS, moneyballList, type ScoredPlayers } from "./moneyball";
import { loadOldEngine, missingOldEngineFixtures, type OldEngineFixture, relDiff } from "./testing/oldEngine";
import { playerRecord, type RecordParts } from "./testing/records";

const MY = 77;

interface Row {
  parts?: RecordParts;
  group?: string | null;
  perf?: number;
  fair: number;
}

function market(rows: Row[]): { players: ScoredPlayers<string>; fair: Float64Array } {
  return {
    players: {
      records: rows.map((r) => playerRecord({ value: 1_000_000, ...r.parts })),
      groups: rows.map((r) => (r.group === undefined ? "A" : r.group)),
      perf: rows.map((r) => r.perf ?? 70),
    },
    fair: Float64Array.from(rows, (r) => r.fair),
  };
}

const uidsOf = (players: ScoredPlayers<string>, picks: number[]) => picks.map((k) => players.records[k].uid);

describe("moneyballList", () => {
  it("defaults to the old thresholds", () => {
    expect(DEFAULT_MONEYBALL_OPTIONS).toEqual({
      minRatio: 2,
      minPerf: 60,
      minFair: 250_000,
      excludeClubUid: null,
      minMinutes: 900,
      poolMinutes: 300,
    });
  });

  it("lists fair value at least minRatio times value, most undervalued first, ties in record order", () => {
    const { players, fair } = market([
      { fair: 2_500_000 },
      { fair: 5_000_000 },
      { fair: 1_999_999 },
      { fair: 2_500_000 },
      { fair: 2_000_000 },
    ]);
    expect(moneyballList(players, fair)).toEqual(uidsOf(players, [1, 0, 3, 4]));
  });

  it("leaves out the club, unvalued, youth, short-minute, groupless, low-performance and low-fair players", () => {
    const { players, fair } = market([
      { parts: { club_uid: MY }, fair: 9e6 },
      { parts: { club_uid: 5, owner: "Nós", owner_uid: MY }, fair: 9e6 },
      { parts: { value: 0 }, fair: 9e6 },
      { parts: { value: 300_000_000 }, fair: 9e8 },
      { parts: { team: "U21" }, fair: 9e6 },
      { parts: { minutes: 899 }, fair: 9e6 },
      { group: null, fair: 9e6 },
      { perf: 59, fair: 9e6 },
      { perf: NaN, fair: 9e6 },
      { parts: { value: 100_000 }, fair: 249_999 },
      { fair: NaN },
      { fair: 3e6 },
    ]);
    expect(moneyballList(players, fair, { ...DEFAULT_MONEYBALL_OPTIONS, excludeClubUid: MY })).toEqual(
      uidsOf(players, [11]),
    );
  });

  it("every threshold is a setting", () => {
    const { players, fair } = market([{ perf: 50, parts: { minutes: 500 }, fair: 1_500_000 }]);
    const loose = { ...DEFAULT_MONEYBALL_OPTIONS, minRatio: 1.5, minPerf: 50, minMinutes: 500 };
    expect(moneyballList(players, fair, loose)).toEqual(uidsOf(players, [0]));
    expect(moneyballList(players, fair, { ...loose, minFair: 2e6 })).toEqual([]);
  });
});

describe.skipIf(missingOldEngineFixtures("moneyball"))("moneyball on the fixture", () => {
  let fx: OldEngineFixture;
  beforeAll(() => {
    fx = loadOldEngine();
  }, 120_000);

  it("moneyball list equal (order and members)", () => {
    const records = fx.legacyValueRecords;
    const model = fitValueModel(records, fx.perf, fx.groups);
    const fair = fairValues(model, records, fx.perf, fx.groups);
    const players = { records, groups: fx.groups, perf: fx.perf };
    const start = performance.now();
    const list = moneyballList(players, fair, { ...DEFAULT_MONEYBALL_OPTIONS, excludeClubUid: fx.clubUid });
    console.info(
      `moneyballList on ${records.length} players: ${(performance.now() - start).toFixed(1)} ms, ${list.length} listed`,
    );

    const want = fx.golden.moneyball.rows;
    expect(want).toHaveLength(fx.golden.moneyball.count);
    expect(want.length).toBeGreaterThan(300);
    expect(list.map(String)).toEqual(want.map((r) => r.uid));
    for (const row of want) {
      const i = fx.indexOf.get(row.uid)!;
      expect([row.uid, marketValue(records[i])]).toEqual([row.uid, row.value]);
      expect([row.uid, relDiff(fair[i] / marketValue(records[i]), row.ratio) < 1e-3]).toEqual([row.uid, true]);
    }
  });
});
