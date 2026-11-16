import { beforeAll, describe, expect, it } from "vitest";
import type { PlayerRecord } from "@/data/types";
import { analyzeModel } from "./analysis/model";
import { prepareSnapshot } from "./analysis/prepare";
import { DEFAULT_VALUE_MODEL_OPTIONS, fairValue, fairValues, fitValueModel, leastSquares } from "./fairValue";
import type { PosGroup } from "./positions";
import { loadOldEngine, missingOldEngineFixtures, type OldEngineFixture, relDiff } from "./testing/oldEngine";
import { playerRecord, type RecordParts, snapshotOf } from "./testing/records";

interface Fitted {
  records: PlayerRecord[];
  groups: string[];
  perf: number[];
}

function addGroup(into: Fitted, group: string, n: number, parts: (k: number) => RecordParts = () => ({})): Fitted {
  for (let k = 0; k < n; k++) {
    into.records.push(
      playerRecord({
        age: 19 + (k % 14),
        value: 500_000 * (1 + ((k * 7) % 11)),
        division: "Premier League",
        ...parts(k),
      }),
    );
    into.groups.push(group);
    into.perf.push((k * 37) % 100);
  }
  return into;
}

const empty = (): Fitted => ({ records: [], groups: [], perf: [] });
const fitModel = (m: Fitted, opts = DEFAULT_VALUE_MODEL_OPTIONS) => fitValueModel(m.records, m.perf, m.groups, opts);

describe("fitValueModel", () => {
  it("defaults to the old thresholds", () => {
    expect(DEFAULT_VALUE_MODEL_OPTIONS).toEqual({ minMinutes: 900, minRows: 50, poolMinutes: 300 });
  });

  it("fits only valued senior players with the minutes, an age and a performance", () => {
    const m = addGroup(empty(), "A", 50);
    const left = [
      playerRecord({ minutes: 899 }),
      playerRecord({ value: 0 }),
      playerRecord({ value: 300_000_000 }),
      playerRecord({ team: "U21" }),
      playerRecord({ age: null }),
    ];
    for (const r of left) {
      m.records.push(r);
      m.groups.push("A");
      m.perf.push(70);
    }
    m.records.push(playerRecord());
    m.groups.push("A");
    m.perf.push(NaN);
    const model = fitModel(m);
    expect(model.rows).toEqual({ A: 50 });
    expect(model.beta.A).toHaveLength(6);
  });

  it("a group under minRows gets no model, so its players get no fair value", () => {
    const m = addGroup(addGroup(empty(), "A", 60), "B", 10);
    const model = fitModel(m);
    expect(model.rows).toEqual({ A: 60, B: 10 });
    expect(Object.keys(model.beta)).toEqual(["A"]);
    expect(fairValue(model, m.records[60], "B", 50)).toBeNull();
    expect(
      fairValue(fitModel(m, { ...DEFAULT_VALUE_MODEL_OPTIONS, minRows: 10 }), m.records[60], "B", 50),
    ).not.toBeNull();
  });

  it("a league's level is the median of its valued pool players, or the overall median under 10 of them", () => {
    const m = addGroup(empty(), "A", 12, (k) => ({ value: 10 ** (5 + k / 10) }));
    addGroup(m, "A", 3, () => ({ division: "Bundesliga", value: 10 ** 7 }));
    const model = fitModel(m);
    expect(model.leagueLevel.get("premier league")).toBeCloseTo(5.55, 12);
    expect(model.overallLevel).toBeCloseTo(5.7, 12);
    expect(model.leagueLevel.get("bundesliga")).toBe(model.overallLevel);
  });
});

describe("leastSquares", () => {
  it("without a ridge, recovers an exact linear relation, the intercept first", () => {
    const rows = Array.from({ length: 30 }, (_, k): [number[], number] => {
      const x = [1, k % 7, (k * k) % 11];
      return [x, 3 - 2 * x[1] + 0.5 * x[2]];
    });
    expect(leastSquares(rows, 0).map((b) => Number(b.toFixed(9)))).toEqual([3, -2, 0.5]);
  });

  it("stays solvable when a feature never varies, giving it no weight", () => {
    const rows = Array.from({ length: 30 }, (_, k): [number[], number] => [[1, k, 4], 1 + k]);
    const [intercept, slope, flat] = leastSquares(rows);
    expect([intercept, slope].map((b) => Number(b.toFixed(4)))).toEqual([1, 1]);
    expect(Math.abs(flat)).toBeLessThan(1e-3);
  });
});

describe("fairValue", () => {
  it("predicts a group's shared value for anyone in it", () => {
    const m = addGroup(empty(), "A", 60, () => ({ value: 2_000_000 }));
    const model = fitModel(m);
    expect(relDiff(fairValue(model, playerRecord({ age: 31, division: "Nowhere" }), "A", 85)!, 2_000_000)).toBeLessThan(
      1e-6,
    );
  });

  it("is null without a performance, an age or a group", () => {
    const m = addGroup(empty(), "A", 60);
    const model = fitModel(m);
    expect(fairValue(model, m.records[0], "A", NaN)).toBeNull();
    expect(fairValue(model, { ...m.records[0], age: null }, "A", 50)).toBeNull();
    expect(fairValue(model, m.records[0], null, 50)).toBeNull();
  });

  it("fairValues gives the column, NaN for none", () => {
    const m = addGroup(addGroup(empty(), "A", 60), "B", 1);
    const model = fitModel(m);
    const col = fairValues(model, m.records, m.perf, m.groups);
    expect(col).toBeInstanceOf(Float64Array);
    expect(col[0]).toBe(fairValue(model, m.records[0], "A", m.perf[0]));
    expect(col[60]).toBeNaN();
  });
});

describe.skipIf(missingOldEngineFixtures("fair value"))("fair value on the fixture", () => {
  let fx: OldEngineFixture;
  beforeAll(() => {
    fx = loadOldEngine();
  }, 120_000);

  it("fairValue within 0.1% of the golden with legacy groups", () => {
    const start = performance.now();
    const model = fitValueModel(fx.legacyValueRecords, fx.perf, fx.groups);
    const fair = fairValues(model, fx.legacyValueRecords, fx.perf, fx.groups);
    console.info(
      `fitValueModel + fairValues on ${fx.records.length} players: ${(performance.now() - start).toFixed(1)} ms`,
    );

    const betaDiff = fx.golden.groupKeys.flatMap((g) => {
      const want = fx.golden.valueModel[g]!;
      const got = model.beta[g];
      return got ? want.map((w, k) => relDiff(got[k], w)) : [Infinity];
    });
    console.info(
      `value model rows ${JSON.stringify(model.rows)}, worst beta rel diff ${Math.max(...betaDiff).toExponential(2)}`,
    );
    expect(Object.keys(model.beta).sort()).toEqual(Object.keys(fx.golden.valueModel).sort());
    expect(Math.max(...betaDiff)).toBeLessThan(1e-9);

    const mismatches: string[] = [];
    let compared = 0;
    let worst = 0;
    for (const [uid, p] of Object.entries(fx.golden.players)) {
      const got = fair[fx.indexOf.get(uid)!];
      if (p.fair === null) {
        if (!Number.isNaN(got)) mismatches.push(`${uid} ${p.name}: got ${got}, want null`);
        continue;
      }
      compared++;
      const d = relDiff(got, p.fair);
      worst = Math.max(worst, d);
      if (!(d < 1e-3)) mismatches.push(`${uid} ${p.name}: got ${got}, want ${p.fair}`);
    }
    console.info(
      `fair value parity: ${compared} compared, worst rel diff ${worst.toExponential(2)}, ${mismatches.length} mismatches`,
    );
    expect(compared).toBeGreaterThan(18_000);
    expect(mismatches.slice(0, 20)).toEqual([]);
  });

  it("fair value regression groups by mainGroup when given positions.mainGroup", () => {
    const { records } = fx;
    const prepared = prepareSnapshot(snapshotOf(records));
    const { groups } = prepared;
    const { perfIn } = analyzeModel(prepared, { poolMinutes: 300, myClubUid: null });
    const perf = Float32Array.from(groups, (g, i) => perfIn[g][i]);

    const model = fitValueModel(records, perf, groups);
    const fair = fairValues(model, records, perf, groups);
    console.info(`mainGroup value model rows ${JSON.stringify(model.rows)}`);
    const all: PosGroup[] = ["GK", "ZAG", "LAT", "VOL", "MC", "MEI", "PON", "ATA"];
    expect(Object.keys(model.rows).sort()).toEqual([...all].sort());
    for (const g of all) {
      const rows = model.rows[g] ?? 0;
      if (rows >= DEFAULT_VALUE_MODEL_OPTIONS.minRows) {
        expect(model.beta[g]!.every(Number.isFinite)).toBe(true);
      } else {
        expect(model.beta[g]).toBeUndefined();
        expect(groups.some((x, i) => x === g && !Number.isNaN(fair[i]))).toBe(false);
      }
    }
    expect(Object.keys(model.beta).sort()).toEqual([...all].sort());
  });
});
