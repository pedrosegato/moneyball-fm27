import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { PlayerRecord, Snapshot } from "@/data/types";
import {
  groupPercentiles,
  percentiles,
  poolPercentiles,
  quantile,
  REFMIN,
  rankPercentile,
  referenceOf,
} from "./percentiles";
import { legacyGroup, mainGroup, POS_GROUPS, POS_NAMES } from "./positions";
import { STATS, statIndex } from "./stats/catalog";
import { deriveAll } from "./stats/derive";
import { LEGACY_STAT_KEYS } from "./stats/legacyKeys";
import { applyFilters, type Columns, type FilterSpec, keeperFlags, playerColumns } from "./universe";

const DEV_DATA = path.resolve(import.meta.dirname, "../../../.dev-data");
const GOLDEN = path.join(DEV_DATA, "golden/old-engine.json");
const RAW = path.join(DEV_DATA, "snapshots/2026-11-11-raw-competitive.json");

const oldPercentile = (below: number, n: number) => Math.floor(((below + 1) / (n + 1)) * 100 + 1e-9);

const HIGHER = { lowerIsBetter: false };
const LOWER = { lowerIsBetter: true };
const GK_ONLY = { gkOnly: true };
const ONE_SIDE = { sides: 1 };
const KEEPERS_APART = { sides: 2, keeperSide: 1 };

const ones = (n: number) => new Uint8Array(n).fill(1);
const zeros = (n: number) => new Uint8Array(n);
const col = (values: number[]) => Float64Array.from(values);
const list = (a: ArrayLike<number>) => Array.from(a);
const range = (n: number, from = 1) => Array.from({ length: n }, (_, k) => from + k);

function ratings(values: Partial<Record<(typeof POS_NAMES)[number], number>>): number[] {
  return POS_NAMES.map((name) => values[name] ?? 1);
}

const ST = ratings({ ST: 20 });
const DC = ratings({ DC: 20 });
const GK = ratings({ GK: 20 });

interface Fake {
  pos?: number[];
  minutes?: number;
  division?: string | null;
  value?: number;
  club?: string | null;
  contract_end?: string | null;
  position?: string;
}

function fake({
  pos = ST,
  minutes = 1000,
  division = "Série A",
  value = 1_000_000,
  club = "Clube",
  contract_end = null,
  position = "ST (C)",
}: Fake = {}) {
  return {
    uid: 1,
    name: "Teste",
    pos,
    position,
    age: 25,
    dob: null,
    nat: null,
    nation: null,
    club,
    club_uid: null,
    owner: null,
    owner_uid: null,
    division,
    team: null,
    owner_team: null,
    wage: null,
    contract_end,
    value,
    height: 180,
    foot: "Right",
    ca: 100,
    pa: 120,
    attrs: [],
    personality: [],
    season: minutes ? { minutes } : null,
    keeper: null,
    partial_detail: false,
  } as unknown as PlayerRecord;
}

describe("rankPercentile", () => {
  it("mid rank with no tie equals the old formula", () => {
    let checked = 0;
    for (let n = 1; n <= 2500; n++) {
      for (let below = 0; below < n; below++) {
        if (rankPercentile(below, 1, n) !== oldPercentile(below, n)) {
          throw new Error(`below=${below} n=${n}: ${rankPercentile(below, 1, n)} vs ${oldPercentile(below, n)}`);
        }
        checked++;
      }
    }
    expect(checked).toBe((2500 * 2501) / 2);
  });

  it("puts a tied block at the middle of its ranks", () => {
    expect(rankPercentile(2, 3, 9)).toBe(Math.floor((100 * 4) / 10));
    expect(rankPercentile(0, 2, 3)).toBe(Math.floor((100 * 1.5) / 4));
  });
});

describe("percentiles", () => {
  it("ties use mid rank", () => {
    const values = [...Array(10).fill(0), ...range(10)];
    const [p] = percentiles([col(values)], ones(20), [HIGHER], zeros(20), ONE_SIDE);
    expect(p[0]).toBe(Math.floor((100 * 5.5) / 21));
    expect(p[0]).toBeGreaterThan(oldPercentile(0, 20));
    expect(p[10]).toBe(Math.floor((100 * 11) / 21));
    expect(p[19]).toBe(Math.floor((100 * 20) / 21));
  });

  it("matches the old formula when no value ties", () => {
    const values = range(30).map((v) => v * 1.5);
    const [p] = percentiles([col(values)], ones(30), [HIGHER], zeros(30), ONE_SIDE);
    expect(list(p)).toEqual(range(30, 0).map((b) => oldPercentile(b, 30)));
  });

  it("inverts lower-is-better stats within 0-100", () => {
    const values = range(25);
    const [high, low] = percentiles([col(values), col(values)], ones(25), [HIGHER, LOWER], zeros(25), ONE_SIDE);
    for (let i = 0; i < 25; i++) {
      expect(low[i]).toBe(100 - high[i]);
      expect(low[i]).toBeGreaterThanOrEqual(0);
      expect(low[i]).toBeLessThanOrEqual(100);
    }
    expect(low[0]).toBeGreaterThan(low[24]);
  });

  it("ranks players outside the population against it, like the old small-sample pool", () => {
    const values = [...range(20), 10.5, 0];
    const mask = Uint8Array.from(values, (_, i) => (i < 20 ? 1 : 0));
    const [p] = percentiles([col(values)], mask, [HIGHER], zeros(22), ONE_SIDE);

    expect(p[20]).toBe(oldPercentile(10, 20));
    expect(p[21]).toBe(oldPercentile(0, 20));

    expect(p[19]).toBe(oldPercentile(19, 20));
  });

  it("counts an outside player as one more tied value", () => {
    const values = [...Array(4).fill(5), ...range(16, 10), 5];
    const mask = Uint8Array.from(values, (_, i) => (i < 20 ? 1 : 0));
    const [p] = percentiles([col(values)], mask, [HIGHER], zeros(21), ONE_SIDE);

    expect(p[20]).toBe(Math.floor((100 * 3) / 21));
  });

  it("a population smaller than REFMIN yields null percentiles", () => {
    expect(REFMIN).toBe(20);
    const small = range(REFMIN - 1);
    const [p] = percentiles(
      [col([...small, 5])],
      Uint8Array.from([...small, 0], (_, i) => (i < small.length ? 1 : 0)),
      [HIGHER],
      zeros(REFMIN),
      ONE_SIDE,
    );
    expect(list(p).every(Number.isNaN)).toBe(true);

    const enough = range(REFMIN);
    const [q] = percentiles([col(enough)], ones(REFMIN), [HIGHER], zeros(REFMIN), ONE_SIDE);
    expect(list(q).some(Number.isNaN)).toBe(false);
  });

  it("counts only values that exist toward REFMIN", () => {
    const values = [...range(19), NaN, NaN];
    const [p] = percentiles([col(values)], ones(21), [HIGHER], zeros(21), ONE_SIDE);
    expect(list(p).every(Number.isNaN)).toBe(true);
  });

  it("leaves a player with no value empty", () => {
    const values = [...range(20), NaN];
    const [p] = percentiles([col(values)], ones(21), [HIGHER], zeros(21), ONE_SIDE);
    expect(p[20]).toBeNaN();
    expect(p[19]).toBe(oldPercentile(19, 20));
  });

  it("ranks keepers only against keepers", () => {
    const values = [...range(20), ...range(20, 101)];
    const isGk = Uint8Array.from(values, (_, i) => (i >= 20 ? 1 : 0));
    const [p] = percentiles([col(values)], ones(40), [HIGHER], isGk, KEEPERS_APART);
    expect(p[0]).toBe(oldPercentile(0, 20));
    expect(p[20]).toBe(oldPercentile(0, 20));
    expect(p[19]).toBe(p[39]);
  });

  it("gives keepers no percentile when the population holds too few keepers", () => {
    const values = [...range(20), ...range(5, 101)];
    const isGk = Uint8Array.from(values, (_, i) => (i >= 20 ? 1 : 0));
    const [p] = percentiles([col(values)], ones(25), [HIGHER], isGk, KEEPERS_APART);
    expect(list(p.subarray(20)).every(Number.isNaN)).toBe(true);
    expect(list(p.subarray(0, 20)).some(Number.isNaN)).toBe(false);
  });

  it("ranks each of any number of sides against its own population", () => {
    const values = [...range(20), ...range(20, 101), ...range(20, 201)];
    const side = Uint8Array.from(values, (_, i) => Math.floor(i / 20));
    const [p] = percentiles([col(values)], ones(60), [HIGHER], side, { sides: 3 });
    expect([p[0], p[20], p[40]]).toEqual([oldPercentile(0, 20), oldPercentile(0, 20), oldPercentile(0, 20)]);
    expect([p[19], p[39], p[59]]).toEqual([oldPercentile(19, 20), oldPercentile(19, 20), oldPercentile(19, 20)]);
  });

  it("ranks a gkOnly stat against the keeper side alone, an outfielder with a value placed among it", () => {
    const values = [...range(20, 101), 110.5];
    const isGk = Uint8Array.from(values, (_, i) => (i < 20 ? 1 : 0));
    const [p] = percentiles([col(values)], ones(21), [GK_ONLY], isGk, KEEPERS_APART);
    expect(p[19]).toBe(oldPercentile(19, 20));
    expect(p[20]).toBe(oldPercentile(10, 20));
    const [blank] = percentiles([col(values)], ones(21), [GK_ONLY], isGk, { ...KEEPERS_APART, outsiders: "blank" });
    expect(blank[19]).toBe(oldPercentile(19, 20));
    expect(blank[20]).toBeNaN();
  });

  it("leaves players outside the population blank when asked to, the population ranked as before", () => {
    const values = [...range(20), 10.5, 0];
    const mask = Uint8Array.from(values, (_, i) => (i < 20 ? 1 : 0));
    const [placed] = percentiles([col(values)], mask, [HIGHER], zeros(22), ONE_SIDE);
    const [blank] = percentiles([col(values)], mask, [HIGHER], zeros(22), { ...ONE_SIDE, outsiders: "blank" });
    expect([blank[20], blank[21]]).toEqual([NaN, NaN]);
    expect(list(blank.subarray(0, 20))).toEqual(list(placed.subarray(0, 20)));
  });

  it("needs a keeper side for a gkOnly stat and a side under the count for every player", () => {
    expect(() => percentiles([col(range(20))], ones(20), [GK_ONLY], zeros(20), ONE_SIDE)).toThrow(/keeper side/);
    expect(() => percentiles([col(range(20))], ones(20), [HIGHER], ones(20), ONE_SIDE)).toThrow(/side/);
    expect(() => percentiles([col(range(20))], ones(20), [GK_ONLY], zeros(20), { sides: 2, keeperSide: 2 })).toThrow(
      /keeper side 2/,
    );
    expect(() => percentiles([col(range(20))], ones(20), [HIGHER], zeros(20), { sides: 1, keeperSide: -1 })).toThrow(
      /keeper side/,
    );
  });

  it("returns one Float32Array per stat", () => {
    const out = percentiles([col(range(20)), col(range(20))], ones(20), [HIGHER, LOWER], zeros(20), ONE_SIDE);
    expect(out).toHaveLength(2);
    expect(out[0]).toBeInstanceOf(Float32Array);
    expect(out[0]).toHaveLength(20);
  });

  it("rejects columns that do not line up with the stat definitions", () => {
    expect(() => percentiles([col(range(20))], ones(20), [HIGHER, LOWER], zeros(20), ONE_SIDE)).toThrow();
  });
});

describe("quantile", () => {
  it("interpolates between the two nearest ranks", () => {
    expect(quantile(col([1, 2, 3, 4]), 0.5)).toBe(2.5);
    expect(quantile(col(range(20)), 0.95)).toBeCloseTo(19.05, 10);
    expect(quantile(col(range(20)), 0.05)).toBeCloseTo(1.95, 10);
  });

  it("returns the ends at 0 and 1, the value alone for one, and NaN for none", () => {
    expect(quantile(col([3, 8]), 0)).toBe(3);
    expect(quantile(col([3, 8]), 1)).toBe(8);
    expect(quantile(col([7]), 0.95)).toBe(7);
    expect(quantile(col([]), 0.5)).toBeNaN();
  });
});

describe("percentile references", () => {
  const reference = (ref: Float64Array, side: number) => referenceOf({ stat: ref }, "stat", side);

  it("gives each side the median and top-5% value of the population it was ranked against", () => {
    const values = [...range(20), ...range(20, 101)];
    const isGk = Uint8Array.from(values, (_, i) => (i >= 20 ? 1 : 0));
    const references: Float64Array[] = [];
    percentiles([col(values)], ones(40), [HIGHER], isGk, { ...KEEPERS_APART, references });
    expect(reference(references[0], 0).median).toBe(10.5);
    expect(reference(references[0], 0).top).toBeCloseTo(19.05, 10);
    expect(reference(references[0], 1).median).toBe(110.5);
    expect(reference(references[0], 1).top).toBeCloseTo(119.05, 10);
  });

  it("takes the top 5% of a lower-is-better stat from its low end", () => {
    const references: Float64Array[] = [];
    percentiles([col(range(20))], ones(20), [LOWER], zeros(20), { ...ONE_SIDE, references });
    expect(reference(references[0], 0).median).toBe(10.5);
    expect(reference(references[0], 0).top).toBeCloseTo(1.95, 10);
  });

  it("counts only the population's players with a value", () => {
    const values = [...range(20), 1000, NaN];
    const mask = Uint8Array.from(values, (_, i) => (i < 20 || i === 21 ? 1 : 0));
    const references: Float64Array[] = [];
    percentiles([col(values)], mask, [HIGHER], zeros(22), { ...ONE_SIDE, references });
    expect(reference(references[0], 0).median).toBe(10.5);
  });

  it("is empty for a side whose population is under REFMIN, as its percentiles are", () => {
    const values = [...range(20), ...range(5, 101)];
    const isGk = Uint8Array.from(values, (_, i) => (i >= 20 ? 1 : 0));
    const references: Float64Array[] = [];
    percentiles([col(values)], ones(25), [HIGHER], isGk, { ...KEEPERS_APART, references });
    expect(reference(references[0], 0).median).toBe(10.5);
    expect(reference(references[0], 1).median).toBeNaN();
    expect(reference(references[0], 1).top).toBeNaN();
  });

  it("refers every side to the keepers for a gkOnly stat, and to everyone with a single side", () => {
    const values = [...range(20, 101), ...range(20)];
    const isGk = Uint8Array.from(values, (_, i) => (i < 20 ? 1 : 0));
    const keeperStat: Float64Array[] = [];
    percentiles([col(values)], ones(40), [GK_ONLY], isGk, { ...KEEPERS_APART, references: keeperStat });
    expect(reference(keeperStat[0], 0).median).toBe(110.5);
    expect(reference(keeperStat[0], 1).median).toBe(110.5);

    const together: Float64Array[] = [];
    percentiles([col(values)], ones(40), [HIGHER], zeros(40), { ...ONE_SIDE, references: together });
    expect(reference(together[0], 0).median).toBe(60.5);
  });

  it("holds a median and a top-5% value per side, NaN outside the sides the ranking had", () => {
    const values = [...range(20), ...range(20, 101), ...range(20, 201)];
    const side = Uint8Array.from(values, (_, i) => Math.floor(i / 20));
    const references: Float64Array[] = [];
    percentiles([col(values)], ones(60), [HIGHER], side, { sides: 3, references });
    expect(references[0]).toHaveLength(6);
    expect([0, 1, 2].map((s) => reference(references[0], s).median)).toEqual([10.5, 110.5, 210.5]);
    expect(referenceOf({ stat: references[0] }, "other", 0)).toEqual({ median: NaN, top: NaN });
  });

  it("leaves the percentiles themselves unchanged", () => {
    const values = [...range(20), ...range(20, 101)];
    const isGk = Uint8Array.from(values, (_, i) => (i >= 20 ? 1 : 0));
    const [plain] = percentiles([col(values)], ones(40), [HIGHER], isGk, KEEPERS_APART);
    const [withReferences] = percentiles([col(values)], ones(40), [HIGHER], isGk, { ...KEEPERS_APART, references: [] });
    expect(list(withReferences)).toEqual(list(plain));
  });
});

describe("applyFilters", () => {
  const players = [
    fake({ value: 500_000, club: "A", contract_end: "2027-06-30", position: "D (C), DM" }),
    fake({ value: 2_000_000, club: "B", contract_end: null, position: "ST (C)" }),
    fake({ value: 9_000_000, club: null, contract_end: "2029-01-01", position: "AM (RL), ST (C)" }),
  ];
  const stat = col([1.5, NaN, 3]);
  const cols: Columns = {
    ...playerColumns(players),
    "xG/90": (i) => stat[i],
    tokens: (i) => players[i].position.split(",").map((t) => t.trim()),
  };
  const kept = (filters: FilterSpec[]) => list(applyFilters(players, cols, filters));

  it("keeps every row with no filters", () => {
    expect(kept([])).toEqual([1, 1, 1]);
  });

  it("range bounds are inclusive", () => {
    expect(kept([{ col: "value", kind: "range", min: 500_000, max: 2_000_000 }])).toEqual([1, 1, 0]);
  });

  it("range never matches a missing value", () => {
    expect(kept([{ col: "xG/90", kind: "range", min: 0 }])).toEqual([1, 0, 1]);
    expect(kept([{ col: "wage", kind: "range", max: 1e9 }])).toEqual([0, 0, 0]);
  });

  it("a filter with no bound or value constrains nothing", () => {
    expect(kept([{ col: "xG/90", kind: "range" }])).toEqual([1, 1, 1]);
    expect(kept([{ col: "club", kind: "set", values: [] }])).toEqual([1, 1, 1]);
    expect(kept([{ col: "contract_end", kind: "dateRange" }])).toEqual([1, 1, 1]);
  });

  it("a bound lost to null by JSON, or NaN, constrains nothing", () => {
    const persisted = JSON.stringify({ col: "value", kind: "range", min: NaN, max: 2_000_000 });
    const restored = JSON.parse(persisted) as FilterSpec;
    expect(kept([restored])).toEqual([1, 1, 0]);
    expect(kept([{ col: "value", kind: "range", min: NaN }])).toEqual([1, 1, 1]);
  });

  it("set matches a string column", () => {
    expect(kept([{ col: "club", kind: "set", values: ["A", "B"] }])).toEqual([1, 1, 0]);
  });

  it('set matches the empty value through ""', () => {
    expect(kept([{ col: "club", kind: "set", values: [""] }])).toEqual([0, 0, 1]);
  });

  it("set matches any token of a list column", () => {
    expect(kept([{ col: "tokens", kind: "set", values: ["ST (C)"] }])).toEqual([0, 1, 1]);
  });

  it("dateRange compares ISO dates inclusively and drops missing dates", () => {
    expect(kept([{ col: "contract_end", kind: "dateRange", to: "2027-06-30" }])).toEqual([1, 0, 0]);
    expect(kept([{ col: "contract_end", kind: "dateRange", from: "2027-07-01" }])).toEqual([0, 0, 1]);
  });

  it("every filter must hold", () => {
    expect(
      kept([
        { col: "value", kind: "range", min: 1_000_000 },
        { col: "xG/90", kind: "range", min: 0 },
      ]),
    ).toEqual([0, 0, 1]);
  });

  it("an impossible filter keeps nothing", () => {
    expect(kept([{ col: "value", kind: "range", min: 10, max: 5 }])).toEqual([0, 0, 0]);
  });

  it("never keeps a height the game left at 0, which the table shows as missing", () => {
    const tall = [180, 0, 190].map((height) => ({ ...fake(), height }));
    const kept = applyFilters(tall, playerColumns(tall), [{ col: "height", kind: "range", max: 185 }]);
    expect(list(kept)).toEqual([1, 0, 0]);
  });

  it("rejects an unknown column", () => {
    expect(() => kept([{ col: "nope", kind: "range", min: 1 }])).toThrow(/nope/);
  });
});

describe("playerColumns", () => {
  it("exposes identity fields, minutes, the main group and stat columns", () => {
    const players = [fake({ pos: DC, minutes: 450 }), fake({ minutes: 0 })];
    const derived = STATS.map(() => col([NaN, NaN]));
    derived[statIndex("G/90")][0] = 0.5;
    const cols = playerColumns(players, { defs: STATS, cols: derived });
    expect(cols.club(0)).toBe("Clube");
    expect(cols.minutes(0)).toBe(450);
    expect(cols.minutes(1)).toBe(0);
    expect(cols.group(0)).toBe("ZAG");
    expect(cols.groups(0)).toEqual(["ZAG"]);
    expect(cols["G/90"](0)).toBe(0.5);
    expect(cols["G/90"](1)).toBeNaN();
  });

  it("lists the natural positions (rated 18+) the table's Pos column shows, as a set filter can match them", () => {
    const winger = POS_NAMES.map((name) => (name === "ST" ? 20 : name === "AMR" ? 18 : name === "AML" ? 17 : 1));
    const players = [fake({ pos: winger }), fake({ pos: DC }), fake({ pos: [] })];
    const cols = playerColumns(players);
    expect(cols.naturalPositions(0)).toEqual(["AMR", "ST"]);
    expect(list(applyFilters(players, cols, [{ col: "naturalPositions", kind: "set", values: ["ST", "DC"] }]))).toEqual(
      [1, 1, 0],
    );
  });

  it("keeps stat keys apart from identity columns", () => {
    const identity = Object.keys(playerColumns([]));
    for (const s of STATS) expect(identity).not.toContain(s.key);
  });
});

describe("keeperFlags", () => {
  it("marks players whose main group is GK", () => {
    const players = [fake({ pos: ST }), fake({ pos: DC }), fake({ pos: GK }), fake({ pos: ST, minutes: 0 })];
    expect(list(keeperFlags(players))).toEqual([0, 0, 1, 0]);
  });
});

describe("hide-only filters and percentiles", () => {
  const players = range(30, 0).map((k) =>
    fake({ minutes: 1000, division: k % 2 ? "Série B" : "Série A", value: k * 100_000 }),
  );
  const stat = col(range(30, 0).map((k) => k * 0.1));
  const cols = playerColumns(players);
  const pct = () => percentiles([stat], ones(30), [HIGHER], keeperFlags(players), KEEPERS_APART)[0];

  it("hide-only filters do not change percentiles", () => {
    const hide: FilterSpec[] = [{ col: "value", kind: "range", max: 1_000_000 }];
    const before = pct();
    const visible = applyFilters(players, cols, hide);
    expect(list(visible).filter(Boolean)).toHaveLength(11);
    const after = pct();
    expect(list(after)).toEqual(list(before));

    expect(after[0]).toBe(oldPercentile(0, 30));
  });
});

describe("groupPercentiles", () => {
  const at = (g: (typeof POS_GROUPS)[number]) => POS_GROUPS.indexOf(g);

  const groups = [
    ...range(25).map(() => at("ATA")),
    ...range(25).map(() => at("ZAG")),
    ...range(25).map(() => at("GK")),
    ...range(5).map(() => at("VOL")),
    at("ATA"),
    at("ATA"),
  ];
  const group = Uint8Array.from(groups);
  const pool = Uint8Array.from(groups, (_, i) => (i < 80 ? 1 : 0));
  const stat = col([...range(25), ...range(25, 101), ...range(25, 201), ...range(5, 50), 30, 12.5]);
  const BENCHED = 80;

  it("ranks each player against his own group's pool", () => {
    const [p] = groupPercentiles([stat], [HIGHER], pool, group);
    expect([p[24], p[49], p[74]]).toEqual([
      rankPercentile(24, 1, 25),
      rankPercentile(24, 1, 25),
      rankPercentile(24, 1, 25),
    ]);
    expect([p[0], p[25], p[50]]).toEqual([
      rankPercentile(0, 1, 25),
      rankPercentile(0, 1, 25),
      rankPercentile(0, 1, 25),
    ]);
  });

  it("gives no percentile to a player under the pool's minutes, and ranks the pool as if he were not there", () => {
    const [p] = groupPercentiles([stat], [HIGHER], pool, group);
    expect([p[BENCHED], p[BENCHED + 1]]).toEqual([NaN, NaN]);
    const [without] = groupPercentiles([stat.subarray(0, 80)], [HIGHER], pool.subarray(0, 80), group.subarray(0, 80));
    expect(list(p.subarray(0, 80))).toEqual(list(without));
  });

  it("gives no percentile in a group with fewer than REFMIN pool players", () => {
    const [p] = groupPercentiles([stat], [HIGHER], pool, group);
    expect(list(p.subarray(75, 80)).every(Number.isNaN)).toBe(true);
  });

  it("keeps keepers and outfield players apart on a gkOnly stat", () => {
    const keeperStat = col([
      ...range(25).map(() => NaN),
      ...range(25).map(() => NaN),
      ...range(25, 201),
      ...range(7).map(() => NaN),
    ]);
    keeperStat[0] = 212;
    const [p] = groupPercentiles([keeperStat], [GK_ONLY], pool, group);
    expect(p[0]).toBeNaN();
    expect(p[74]).toBe(rankPercentile(24, 1, 25));
  });

  it("refers each group to its own pool's median and top 5%", () => {
    const references: Float64Array[] = [];
    groupPercentiles([stat], [HIGHER], pool, group, references);
    const of = (g: (typeof POS_GROUPS)[number]) => referenceOf({ stat: references[0] }, "stat", at(g));
    expect([of("ATA").median, of("ZAG").median, of("GK").median]).toEqual([13, 113, 213]);
    expect(of("VOL")).toEqual({ median: NaN, top: NaN });
    expect(references[0]).toHaveLength(2 * POS_GROUPS.length);
  });
});

describe("poolPercentiles", () => {
  const players = [
    ...range(25).map((k) => fake({ pos: GK, division: k % 2 ? "Série A" : "Série B" })),
    ...range(25).map((k) => fake({ pos: ST, division: k % 2 ? "Série A" : "Série B" })),
    ...range(5).map(() => fake({ pos: ST, minutes: 300 })),
  ];
  const stat = col([...range(25), ...range(25), ...range(5, 30)]);
  const poolOf = (minutes: number) => Uint8Array.from(players, (r) => ((r.season?.minutes ?? 0) >= minutes ? 1 : 0));
  const pct = (minutes: number) => poolPercentiles([stat], [HIGHER], poolOf(minutes), keeperFlags(players))[0];

  it("ranks among every player with the pool's minutes, keepers against keepers, in every league", () => {
    const pool = pct(300);
    expect([pool[24], pool[49], pool[54]]).toEqual([
      rankPercentile(24, 1, 25),
      rankPercentile(24, 1, 30),
      rankPercentile(29, 1, 30),
    ]);

    const strict = pct(900);
    expect([strict[49], strict[54]]).toEqual([rankPercentile(24, 1, 25), rankPercentile(25, 1, 25)]);
  });
});

interface Golden {
  meta: { pool: { ok: number; small: number } };
  statKeys: string[];
  players: Record<string, { name: string; mins: number; ok: boolean; pct: (number | null)[] }>;
}

const missingFixtures = [GOLDEN, RAW].filter((f) => !fs.existsSync(f));

if (missingFixtures.length)
  console.warn(`SKIPPED percentile parity with the old engine: missing ${missingFixtures.join(", ")}`);

describe.skipIf(missingFixtures.length > 0)("parity with the old engine (golden)", () => {
  let golden: Golden;
  let records: PlayerRecord[];
  let derived: Float64Array[];

  beforeAll(() => {
    golden = JSON.parse(fs.readFileSync(GOLDEN, "utf8")) as Golden;
    records = (JSON.parse(fs.readFileSync(RAW, "utf8")) as Snapshot).players;
    derived = deriveAll(records, { applyMinSample: false });
  }, 120_000);

  it("no-tie values equal old formula", () => {
    expect(golden.statKeys).toEqual([...LEGACY_STAT_KEYS]);
    const isGk = Uint8Array.from(records, (r) => (legacyGroup(r.position) === "GK" ? 1 : 0));
    const mask = Uint8Array.from(records, (r) => ((r.season?.minutes ?? 0) >= 300 ? 1 : 0));
    expect(mask.reduce((a, b) => a + b, 0)).toBe(golden.meta.pool.ok);
    const pct = percentiles(derived, mask, STATS, isGk, KEEPERS_APART);

    const row = new Map(records.map((r, i) => [String(r.uid), i]));
    const mismatches: string[] = [];
    const counts = { compared: 0, tied: 0, nulls: 0, belowRefmin: 0 };
    golden.statKeys.forEach((key, k) => {
      const j = statIndex(key);
      const values = derived[j];

      const pools = [new Map<number, number>(), new Map<number, number>()];
      for (let i = 0; i < records.length; i++) {
        if (mask[i] && !Number.isNaN(values[i]))
          pools[isGk[i]].set(values[i], (pools[isGk[i]].get(values[i]) ?? 0) + 1);
      }
      const size = pools.map((pool) => [...pool.values()].reduce((a, b) => a + b, 0));
      for (const [uid, p] of Object.entries(golden.players)) {
        const i = row.get(uid);
        if (i === undefined) {
          mismatches.push(`${uid} missing from the snapshot`);
          continue;
        }
        if (k === 0 && p.ok !== Boolean(mask[i])) mismatches.push(`${uid} ${p.name}: pool membership differs`);
        const want = p.pct[k] ?? NaN;
        const got = pct[j][i];
        if (Number.isNaN(want)) {
          counts.nulls++;
          if (!Number.isNaN(got)) mismatches.push(`${uid} ${p.name} ${key}: got ${got}, want null`);
          continue;
        }
        if (size[isGk[i]] < REFMIN) {
          counts.belowRefmin++;
          if (!Number.isNaN(got)) mismatches.push(`${uid} ${p.name} ${key}: pool of ${size[isGk[i]]} must be null`);
          continue;
        }
        const others = (pools[isGk[i]].get(values[i]) ?? 0) - mask[i];
        if (others > 0) {
          counts.tied++;

          const lifted = STATS[j].lowerIsBetter ? got <= want : got >= want;
          if (!lifted) mismatches.push(`${uid} ${p.name} ${key}: tied ${got} moved the wrong way from ${want}`);
          continue;
        }
        counts.compared++;
        if (got !== want) mismatches.push(`${uid} ${p.name} ${key}: got ${got}, want ${want}`);
      }
    });
    console.info(`percentile parity: ${JSON.stringify(counts)}, ${mismatches.length} mismatches`);

    expect(counts.compared).toBeGreaterThan(300_000);
    expect(mismatches.slice(0, 20)).toEqual([]);
    expect(mismatches).toHaveLength(0);
  });

  it("times the display pass by position group and the model pass", () => {
    const pool = Uint8Array.from(records, (r) => ((r.season?.minutes ?? 0) >= 300 ? 1 : 0));
    const group = Uint8Array.from(records, (r) => POS_GROUPS.indexOf(mainGroup(r.pos)));
    const isGk = keeperFlags(records);
    const time = (run: () => Float32Array[]) => {
      run();
      const start = performance.now();
      const pct = run();
      return { ms: performance.now() - start, pct };
    };
    const display = time(() => groupPercentiles(derived, STATS, pool, group, []));
    const model = time(() => poolPercentiles(derived, STATS, pool, isGk));
    console.info(
      `percentiles on ${records.length} players x ${STATS.length} stats: by group ${display.ms.toFixed(0)} ms, ` +
        `the model's two sides ${model.ms.toFixed(0)} ms`,
    );
    expect(display.pct).toHaveLength(STATS.length);
    expect(display.pct.some((p, j) => list(p).some((v, i) => !Object.is(v, model.pct[j][i])))).toBe(true);
  });
});
