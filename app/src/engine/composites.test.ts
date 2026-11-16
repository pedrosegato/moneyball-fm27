import { describe, expect, it } from "vitest";
import {
  ACTIONS_PRESETS,
  type Composite,
  defaultActionsPresets,
  evalComposite,
  rankedPercentileMean,
  shrinkSmallSamples,
  type ValueColumns,
} from "./composites";
import { STATS, type StatKey, statIndex } from "./stats/catalog";

const f32 = (values: number[]) => Float32Array.from(values);
const f64 = (values: number[]) => Float64Array.from(values);
const list = (a: ArrayLike<number>) => Array.from(a);
const range = (n: number, from = 0) => Array.from({ length: n }, (_, k) => from + k);
const keysOf = (c: Composite) => Object.keys(c.weights);
const STAT_KEYS = STATS.map((s) => s.key);

function custom(weights: Record<StatKey, number>, kind: Composite["kind"] = "percentileMean"): Composite {
  return { id: "custom", label: "Teste", kind, weights };
}

describe("ACTIONS_PRESETS", () => {
  it("carry FMDataLab's default weights on our per-90 stats", () => {
    expect(Object.fromEntries(ACTIONS_PRESETS.map((c) => [c.id, c.weights]))).toEqual({
      "actions-def": {
        "Clr/90": 1,
        "Int/90": 1,
        "ShBlk/90": 1,
        "PresC/90": 1,
        "TckWon/90": 1,
        "KTck/90": 10,
        "HdrWon/90": 0.8,
        "KHdr/90": 8,
      },
      "actions-att": { "Ast/90": 1, "CCC/90": 1, "OP-CrC/90": 0.8, "Drb/90": 0.8, "npG/90": 1, "SoT/90": 1 },
      "actions-cre": { "Ast/90": 1, "CCC/90": 1, "OP-CrC/90": 1, "OP-KP/90": 1 },
      "actions-gk": { "Clr/90": 0.1, "Svt/90": 0.4, "Svp/90": 0.4, "Svh/90": 1 },
      "actions-excitement": { "Shots/90": 1, "Drb/90": 1, "CCC/90": 1, "OP-KP/90": 1, "OP-CrA/90": 1 },
    });
    for (const c of ACTIONS_PRESETS) {
      expect(c.kind).toBe("weightedSum");
      for (const key of keysOf(c)) expect(STATS[statIndex(key)].unit).toBe("per90");
    }
  });

  it("GK Actions/90 is for keepers only and the other four for outfielders only", () => {
    expect(ACTIONS_PRESETS.map((c) => [c.id, !!c.gkOnly, !!c.outfieldOnly])).toEqual([
      ["actions-def", false, true],
      ["actions-att", false, true],
      ["actions-cre", false, true],
      ["actions-gk", true, false],
      ["actions-excitement", false, true],
    ]);
  });

  it("every preset stat is in the catalog", () => {
    const keys = ACTIONS_PRESETS.flatMap(keysOf);
    expect(keys.filter((k) => !STAT_KEYS.includes(k))).toEqual([]);
  });
});

describe("evalComposite: weightedSum", () => {
  const DEFENSIVE = ACTIONS_PRESETS.find((c) => c.id === "actions-def")!;
  const OUTFIELDERS = new Uint8Array(2);

  it("weightedSum Defensive Actions uses K Tck weight 10", () => {
    const values: Record<StatKey, number[]> = { "KTck/90": [0.5, 0], "Clr/90": [0, 0.5] };
    const cols: ValueColumns = Object.fromEntries(keysOf(DEFENSIVE).map((k) => [k, f64(values[k] ?? [0, 0])]));
    expect(list(evalComposite(DEFENSIVE, cols, {}, OUTFIELDERS))).toEqual([5, 0.5]);
  });

  it("adds the inputs a player has once 60% of the weight is known", () => {
    const c = custom({ a: 3, b: 2 }, "weightedSum");
    const cols = { a: f64([1, NaN, 1, NaN]), b: f64([2, 4, NaN, NaN]) };

    expect(list(evalComposite(c, cols, {}))).toEqual([7, NaN, 3, NaN]);
  });

  it("leaves outfielders out of GK Actions/90 and keepers out of the other four", () => {
    const keys = [...new Set(ACTIONS_PRESETS.flatMap(keysOf))];
    const cols: ValueColumns = Object.fromEntries(keys.map((k) => [k, f64([1, 1])]));
    const isGk = Uint8Array.from([1, 0]);
    for (const c of ACTIONS_PRESETS) {
      const [keeper, outfielder] = evalComposite(c, cols, {}, isGk);
      expect([c.id, Number.isNaN(keeper), Number.isNaN(outfielder)]).toEqual([c.id, !c.gkOnly, !!c.gkOnly]);
    }
  });

  it("a keeper-only or outfield-only composite needs the keeper flags", () => {
    const cols: ValueColumns = Object.fromEntries(keysOf(DEFENSIVE).map((k) => [k, f64([1, 1])]));
    expect(() => evalComposite(DEFENSIVE, cols, {})).toThrow(/keeper flags/);
    expect(() => evalComposite(DEFENSIVE, cols, {}, new Uint8Array(3))).toThrow(/keeper flags/);
  });
});

describe("evalComposite: percentileMean", () => {
  it("custom composite with 2 stats at weights 10 and 0 equals the first stat percentile", () => {
    const pct = { "Pas%": f32([10, 55, 99, NaN]), "Drb/90": f32([90, NaN, 1, 50]) };
    expect(list(evalComposite(custom({ "Pas%": 10, "Drb/90": 0 }), {}, pct))).toEqual([10, 55, 99, NaN]);
  });

  it("is the weighted mean of the percentiles", () => {
    const pct = { "Pas%": f32([40, 80]), "Drb/90": f32([80, 0]) };
    expect(list(evalComposite(custom({ "Pas%": 3, "Drb/90": 1 }), {}, pct))).toEqual([50, 60]);
  });

  it("needs 6 of 10 equal-weight stats, as the old Performance did", () => {
    const keys = "abcdefghij".split("");
    const c = custom(Object.fromEntries(keys.map((k) => [k, 1])));
    const pct = Object.fromEntries(keys.map((k, j) => [k, f32([j < 6 ? 50 : NaN, j < 5 ? 50 : NaN])]));
    expect(list(evalComposite(c, {}, pct))).toEqual([50, NaN]);
  });

  it("counts a missing heavy stat more than a missing light one", () => {
    const pct = { a: f32([NaN, 30]), b: f32([70, NaN]) };

    expect(list(evalComposite(custom({ a: 10, b: 5 }), {}, pct))).toEqual([NaN, 30]);
  });

  it("is empty when no weight is above 0", () => {
    expect(list(evalComposite(custom({ a: 0 }), {}, { a: f32([50, 60]) }))).toEqual([NaN, NaN]);
  });
});

describe("small samples", () => {
  const sampleOf = (minutes: number[], full = 1800) => ({
    minutes: f64(minutes),
    full: f64(minutes.map(() => full)),
  });

  it("leaves a full sample of minutes unchanged", () => {
    expect(list(shrinkSmallSamples(f32([85, 12, 50]), sampleOf([1800, 4500, 9000])))).toEqual([85, 12, 50]);
  });

  it("moves half a full sample exactly halfway to 50", () => {
    expect(list(shrinkSmallSamples(f32([90, 20]), sampleOf([900, 900])))).toEqual([70, 35]);
  });

  it("ranks a regular with 4500 minutes at 78 ahead of 1350 minutes at 85", () => {
    const [short, regular] = shrinkSmallSamples(f32([85, 78]), sampleOf([1350, 4500]));
    expect(short).toBe(76.25);
    expect(regular).toBe(78);
    expect(regular).toBeGreaterThan(short);
  });

  it("uses each player's own full sample", () => {
    const sample = { minutes: f64([1000, 1000]), full: f64([1000, 2000]) };
    expect(list(shrinkSmallSamples(f32([90, 90]), sample))).toEqual([90, 70]);
  });

  it("keeps a missing score missing and rejects mismatched lengths", () => {
    expect(list(shrinkSmallSamples(f32([NaN, 70]), sampleOf([100, 900])))).toEqual([NaN, 60]);
    expect(() => shrinkSmallSamples(f32([1, 2]), sampleOf([900]))).toThrow(/minutes/);
  });

  it("evalComposite shrinks a percentileMean with a sample and leaves a weightedSum alone", () => {
    const pct = { a: f32([90, 90]) };
    const cols = { a: f64([3, 3]) };
    const sample = sampleOf([900, 1800]);
    expect(list(evalComposite(custom({ a: 1 }), {}, pct, undefined, sample))).toEqual([70, 90]);
    expect(list(evalComposite(custom({ a: 1 }, "weightedSum"), cols, {}, undefined, sample))).toEqual([3, 3]);
  });

  it("evalComposite without a sample gives the unshrunk mean", () => {
    expect(list(evalComposite(custom({ a: 1 }), {}, { a: f32([90]) }))).toEqual([90]);
  });
});

describe("evalComposite: inputs", () => {
  it("rejects a stat with no column", () => {
    expect(() => evalComposite(custom({ a: 1 }), {}, { b: f32([1]) })).toThrow(/"a"/);
    expect(() => evalComposite(custom({ a: 1 }, "weightedSum"), { b: f64([1]) }, {})).toThrow(/"a"/);
  });

  it("rejects columns of different lengths", () => {
    expect(() => evalComposite(custom({ a: 1, b: 1 }), {}, { a: f32([1, 2]), b: f32([1]) })).toThrow();
  });
});

describe("default presets", () => {
  it("are fresh copies the caller may edit", () => {
    const actions = defaultActionsPresets();
    expect(actions).toEqual(ACTIONS_PRESETS);
    actions[0].weights["KTck/90"] = 0;
    expect(defaultActionsPresets()[0].weights["KTck/90"]).toBe(10);
    expect(ACTIONS_PRESETS[0].weights["KTck/90"]).toBe(10);
  });

  it("the shared constants cannot be edited", () => {
    expect(() => {
      ACTIONS_PRESETS[0].weights["KTck/90"] = 0;
    }).toThrow(TypeError);
  });
});

describe("rankedPercentileMean", () => {
  it("re-ranks the weighted mean among the chosen players", () => {
    const pct = { x: f32(range(30)) };
    const among = Uint8Array.from(range(30), (i) => (i < 20 ? 1 : 0));
    const got = rankedPercentileMean(custom({ x: 1 }), pct, among);
    expect(got[0]).toBe(4);
    expect(got[19]).toBe(95);
    expect(got[25]).toBe(100);
  });
});
