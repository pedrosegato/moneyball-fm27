import { beforeAll, describe, expect, it } from "vitest";
import {
  abilities,
  abilityAt,
  abilityColumns,
  abilityPercentiles,
  archetypeScore,
  bestAbility,
  hasAttributes,
  vsAge,
} from "./ability";
import { ABILITY_WEIGHTS, AGE_BENCHMARKS } from "./data/abilityWeights";
import { ATTRIBUTE_NAMES } from "./data/attributes";
import { REFMIN } from "./percentiles";
import { loadOldEngine, missingOldEngineFixtures, nanOf, nullOf, type OldEngineFixture } from "./testing/oldEngine";

const attrs = (values: Record<string, number> = {}, rest = 50) => ATTRIBUTE_NAMES.map((a) => values[a] ?? rest);

describe("ability data", () => {
  it("lists the reader's 47 shown attributes", () => {
    expect(ATTRIBUTE_NAMES).toHaveLength(47);
    expect(new Set(ATTRIBUTE_NAMES).size).toBe(47);
    for (const w of Object.values(ABILITY_WEIGHTS))
      for (const a of Object.keys(w)) expect(ATTRIBUTE_NAMES).toContain(a);
  });

  it("benchmarks ages 15 to 24", () => {
    expect(Object.keys(AGE_BENCHMARKS).map(Number)).toEqual([15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
    expect(AGE_BENCHMARKS[24]).toBe(13.8);
  });
});

describe("archetypeScore", () => {
  it("is the weighted mean of the archetype's attributes on the 1-20 scale", () => {
    expect(archetypeScore(attrs(), "CB")).toBe(10);

    expect(archetypeScore(attrs({ Acceleration: 100 }), "CB")).toBeCloseTo(400 / 35, 12);
  });

  it("needs all 47 attributes", () => {
    expect(hasAttributes(attrs())).toBe(true);
    expect(hasAttributes([])).toBe(false);
    expect(archetypeScore([10, 20], "CB")).toBeNaN();
  });
});

describe("bestAbility / abilities / abilityAt", () => {
  it("scores every archetype the player's positions use and keeps the best", () => {
    const a = attrs({ Dribbling: 100 });
    expect(abilities(a, "D (C), DM")).toEqual({ CB: 10, "WB/6": 370 / 34 });
    expect(bestAbility(a, "D (C), DM")).toEqual({ score: 370 / 34, archetype: "WB/6" });
  });

  it("a central midfielder takes the better of WB/6 and 10", () => {
    const a = attrs({ "Off The Ball": 100 });
    expect(abilityAt(a, "M(C)")).toBe(350 / 33);
    expect(bestAbility(a, "M (C)").archetype).toBe("10");
  });

  it("has no score without attributes or without a scored position", () => {
    expect(bestAbility([], "ST (C)")).toEqual({ score: NaN, archetype: null });
    expect(bestAbility(attrs(), "SW")).toEqual({ score: NaN, archetype: null });
    expect(abilityAt(attrs(), "SW")).toBeNaN();
  });
});

describe("vsAge", () => {
  it("compares with the benchmark for the age, clamped to 15-24", () => {
    expect(vsAge(13.8, 30)).toBe(100);
    expect(vsAge(10.3, 12)).toBe(100);
    expect(vsAge(6.1, 18)).toBe(50);
  });

  it("is unknown without a score or an age", () => {
    expect(vsAge(NaN, 20)).toBeNaN();
    expect(vsAge(12, 0)).toBeNaN();
    expect(vsAge(12, NaN)).toBeNaN();
  });
});

describe("abilityPercentiles", () => {
  it("ranks among the group's pool players with the shared rules, so a small group has none", () => {
    const n = REFMIN + 5;
    const best = [...Array.from({ length: n }, (_, k) => k + 1), 30, 12];
    const groups = [...Array<string | null>(n).fill("A"), "B", null];
    const pool = Uint8Array.from(best, () => 1);
    const pct = abilityPercentiles(best, { groups, pool });
    expect(pct[n - 1]).toBe(Math.floor((100 * n) / (n + 1)));
    expect(pct[n]).toBeNaN();
    expect(pct[n + 1]).toBeNaN();
  });
});

describe.skipIf(missingOldEngineFixtures("ability"))("ability on the fixture", () => {
  let fx: OldEngineFixture;
  beforeAll(() => {
    fx = loadOldEngine();
  }, 120_000);

  it("ability equal to golden best, vsAge and per-archetype scores", () => {
    const start = performance.now();
    const { best, vsAge: va } = abilityColumns(fx.records);
    console.info(`abilityColumns on ${fx.records.length} players: ${(performance.now() - start).toFixed(1)} ms`);
    const mismatches: string[] = [];
    let compared = 0;
    for (const [uid, p] of Object.entries(fx.golden.players)) {
      const i = fx.indexOf.get(uid)!;
      const r = fx.records[i];
      compared++;
      const by = Object.fromEntries(Object.entries(abilities(r.attrs, r.position)).map(([k, v]) => [k, nullOf(v)]));
      if (!Object.is(nullOf(best[i]), p.ability.best)) mismatches.push(`${uid} best ${best[i]} != ${p.ability.best}`);
      if (!Object.is(nullOf(va[i]), p.ability.vsAge)) mismatches.push(`${uid} vsAge ${va[i]} != ${p.ability.vsAge}`);
      try {
        expect(by).toEqual(p.ability.by);
      } catch {
        mismatches.push(`${uid} by ${JSON.stringify(by)} != ${JSON.stringify(p.ability.by)}`);
      }
    }

    for (const row of fx.golden.sellKeep.rows) {
      const i = fx.indexOf.get(row.uid)!;
      compared++;
      if (!Object.is(nullOf(best[i]), row.ability)) mismatches.push(`${row.uid} sk best ${best[i]} != ${row.ability}`);
      if (!Object.is(nullOf(va[i]), row.vsAge)) mismatches.push(`${row.uid} sk vsAge ${va[i]} != ${row.vsAge}`);
    }
    console.info(`ability parity: ${compared} players compared, ${mismatches.length} mismatches`);
    expect(compared).toBeGreaterThan(30_000);
    expect(mismatches.slice(0, 20)).toEqual([]);
  });

  it("ability percentile matches golden Moneyball abilityPct within the mid-rank lift", () => {
    const { best } = abilityColumns(fx.records);
    const pct = abilityPercentiles(best, { groups: fx.groups, pool: fx.pool });
    const mismatches: string[] = [];
    let exact = 0;
    for (const row of fx.golden.moneyball.rows) {
      const got = pct[fx.indexOf.get(row.uid)!];
      const want = nanOf(row.abilityPct);

      if (Number.isNaN(want) ? !Number.isNaN(got) : !(got >= want && got <= want + 1)) {
        mismatches.push(`${row.uid}: ${got} != ${want}`);
      } else if (got === want || (Number.isNaN(got) && Number.isNaN(want))) exact++;
    }
    console.info(
      `abilityPct parity: ${fx.golden.moneyball.rows.length} compared, ${exact} exact, ${mismatches.length} mismatches`,
    );
    expect(fx.golden.moneyball.rows.length).toBeGreaterThan(300);
    expect(mismatches).toEqual([]);
  });
});
