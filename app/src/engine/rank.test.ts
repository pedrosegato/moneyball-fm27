import { beforeAll, describe, expect, it } from "vitest";
import { averageRating, leagueWeight, rankOrder, rankScores } from "./rank";
import { loadOldEngine, missingOldEngineFixtures, type OldEngineFixture } from "./testing/oldEngine";
import { playerRecord } from "./testing/records";

describe("averageRating", () => {
  it("is the rating sum over ten times the rated games", () => {
    expect(averageRating(playerRecord({ season: { rating_sum: 712, rated: 10 } }))).toBeCloseTo(7.12, 12);
    expect(averageRating(playerRecord({ season: { rated: 0 } }))).toBeNaN();
    expect(averageRating(playerRecord({ minutes: 0 }))).toBeNaN();
  });
});

describe("leagueWeight", () => {
  it("defaults to the ranking table's weight, 1 outside it, and takes an override by league key", () => {
    expect(leagueWeight("Premier League")).toBe(1.15);
    expect(leagueWeight("Nowhere League")).toBe(1);
    expect(leagueWeight(null)).toBe(1);
    expect(leagueWeight("Premier League", { "premier league": 1.3 })).toBe(1.3);
    expect(leagueWeight("constructor", {})).toBe(1);
  });
});

describe("rankScores / rankOrder", () => {
  const records = [
    playerRecord({ division: "Premier League" }),
    playerRecord({ division: "Nowhere League" }),
    playerRecord({ division: "Nowhere League" }),
    playerRecord({ division: "Premier League" }),
  ];
  const base = [7, 7.5, 7, NaN];

  it("weighs each score by its league", () => {
    expect(Array.from(rankScores(records, base))).toEqual([7 * 1.15, 7.5, 7, NaN]);
    expect(rankScores(records, base, { "nowhere league": 2 })[1]).toBe(15);
  });

  it("orders the eligible players best first, ties in record order, without the unscored", () => {
    const all = Uint8Array.from([1, 1, 1, 1]);
    expect(rankOrder(base, all)).toEqual([1, 0, 2]);
    expect(rankOrder(rankScores(records, base), all)).toEqual([0, 1, 2]);
    expect(rankOrder(base, Uint8Array.from([1, 0, 1, 1]))).toEqual([0, 2]);
  });
});

describe.skipIf(missingOldEngineFixtures("rank"))("rank on the fixture", () => {
  let fx: OldEngineFixture;
  beforeAll(() => {
    fx = loadOldEngine();
  }, 120_000);

  it("rank equal within 1e-6", () => {
    const { records } = fx;
    const start = performance.now();
    const base = Float64Array.from(records, averageRating);
    const weighted = rankScores(records, base);
    const pos = rankOrder(base, fx.pool);
    const posWeighted = rankOrder(weighted, fx.pool);
    console.info(`rank on ${records.length} players: ${(performance.now() - start).toFixed(1)} ms`);

    const placeOf = (order: number[]) => new Map(order.map((i, k) => [i, k + 1]));
    const place = placeOf(pos);
    const placeWeighted = placeOf(posWeighted);
    const mismatches: string[] = [];
    let compared = 0;
    for (const [uid, p] of Object.entries(fx.golden.players)) {
      const i = fx.indexOf.get(uid)!;
      if (p.rank === null) {
        if (place.has(i)) mismatches.push(`${uid} ${p.name}: ranked, want unranked`);
        continue;
      }
      compared++;
      const { base: b, weight, weighted: w, pos: at, posWeighted: atWeighted } = p.rank;
      const got = { base: base[i], weight: leagueWeight(records[i].division), weighted: weighted[i] };
      if (!(Math.abs(got.base - b) <= 1e-6 && got.weight === weight && Math.abs(got.weighted - w) <= 1e-6)) {
        mismatches.push(`${uid} ${p.name}: ${JSON.stringify(got)} != ${JSON.stringify({ b, weight, w })}`);
      }
      if (place.get(i) !== at || placeWeighted.get(i) !== atWeighted) {
        mismatches.push(`${uid} ${p.name}: place ${place.get(i)}/${placeWeighted.get(i)}, want ${at}/${atWeighted}`);
      }
    }
    console.info(`rank parity: ${compared} compared, ${mismatches.length} mismatches`);
    expect(compared).toBe(fx.golden.meta.pool.ok);
    expect(pos).toHaveLength(compared);
    expect(mismatches.slice(0, 20)).toEqual([]);
  });
});
