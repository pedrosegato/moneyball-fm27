import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { Keeper, PlayerRecord, RecordStats, Season, Snapshot } from "@/data/types";
import { STATS, statIndex } from "./catalog";
import { deriveAll } from "./derive";
import { STAT_GROUPS } from "./groups";
import { LEGACY_STAT_KEYS } from "./legacyKeys";

const DEV_DATA = path.resolve(import.meta.dirname, "../../../../.dev-data");
const GOLDEN = path.join(DEV_DATA, "golden/old-engine.json");
const RAW = path.join(DEV_DATA, "snapshots/2026-11-11-raw-competitive.json");

const RECORD_ZERO: RecordStats = {
  pas_att: 0,
  pas_cmp: 0,
  tck_att: 0,
  tck_won: 0,
  hdr_att: 0,
  hdr_won: 0,
  drb: 0,
  fouls: 0,
  fouls_won: 0,
  shots: 0,
  sot: 0,
  distance10: 0,
  offsides: 0,
  saves_tipped: 0,
  op_crs_cmp: 0,
  kp: 0,
  tck_key: 0,
  hdr_key: 0,
  int: 0,
  ccc: 0,
  blocks: 0,
  poss_lost: 0,
  poss_won: 0,
  xg100: 0,
  xa100: 0,
  clr: 0,
  fk: 0,
  goals_out: 0,
  op_crs_att: 0,
  shots_out: 0,
  xgp100: 0,
  sprints: 0,
  pr_passes: 0,
  pres_att: 0,
  pres_cmp: 0,
  op_kp: 0,
  npxg100: 0,
  crs_att: 0,
  crs_cmp: 0,
  shots_blk: 0,
  hdr_lost: 0,
};

const SEASON_ZERO: Season = {
  rating_sum: 0,
  minutes: 0,
  starts: 0,
  subs: 0,
  rated: 0,
  goals: 0,
  assists: 0,
  conceded: 0,
  pens_taken: 0,
  pens_scored: 0,
  motm: 0,
  red: 0,
  yellow: 0,
  clean_sheets: 0,
};

const STRIKER_POS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 20, 1, 1];
const KEEPER_POS = [20, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

interface RecordParts {
  season?: Partial<Season> | null;
  record?: Partial<RecordStats>;
  keeper?: Keeper | null;
  pos?: number[];
}

function player({ season, record, keeper = null, pos = STRIKER_POS }: RecordParts = {}): PlayerRecord {
  return {
    uid: 1,
    name: "Teste",
    pos,
    position: "ST",
    age: 25,
    dob: null,
    nat: null,
    nation: null,
    club: null,
    club_uid: null,
    owner: null,
    owner_uid: null,
    division: null,
    team: null,
    owner_team: null,
    wage: null,
    contract_end: null,
    value: 0,
    height: 180,
    foot: "Right",
    ca: 100,
    pa: 120,
    attrs: [],
    personality: [],
    season:
      season === null ? null : { ...SEASON_ZERO, minutes: 900, starts: 10, rated: 10, rating_sum: 700, ...season },
    record: { ...RECORD_ZERO, pas_att: 300, pas_cmp: 240, distance10: 1000, sprints: 50, ...record },
    keeper,
    partial_detail: true,
  };
}

function value(r: PlayerRecord, key: string, opts?: Parameters<typeof deriveAll>[1]): number | null {
  const v = deriveAll([r], opts)[statIndex(key)][0];
  return Number.isNaN(v) ? null : v;
}

describe("catalog", () => {
  it("is a superset of the 59 legacy STAT_LIST keys", () => {
    const keys = STATS.map((s) => s.key);
    expect(LEGACY_STAT_KEYS).toHaveLength(59);
    expect([LEGACY_STAT_KEYS[0], LEGACY_STAT_KEYS[58]]).toEqual(["G/90", "PenSv%"]);
    for (const k of LEGACY_STAT_KEYS) expect(keys).toContain(k);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps each group's stats together, in STAT_GROUPS order", () => {
    const order = STAT_GROUPS.map((g) => g.id as string);
    const seen = STATS.map((s) => order.indexOf(s.group));
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
  });

  it("has the required FMDataLab-style stats", () => {
    const required = [
      "xG-OP",
      "npG-npxG/90",
      "xA-OP",
      "Conv%",
      "NP-Gls/Shot",
      "KP%",
      "OP-KP%",
      "PrPass%",
      "Poss+-/90",
      "Poss+-%",
      "Duel%",
      "Pres%",
      "TckQlty",
      "Mins/Gl",
      "Mins/Ast",
      "Asts/CCC",
      "Saves",
    ];
    for (const key of required) expect(() => statIndex(key)).not.toThrow();
    expect(STATS[statIndex("npG-npxG/90")].abbr).toBe("npxG-OP/90");
  });

  it("puts every stat in a known group with a pt-BR label", () => {
    const groups = new Set(STAT_GROUPS.map((g) => g.id));
    for (const s of STATS) {
      expect(groups.has(s.group), s.key).toBe(true);
      expect(s.label.length, s.key).toBeGreaterThan(3);
      expect(s.abbr.length, s.key).toBeGreaterThan(0);
    }
    expect(STAT_GROUPS.map((g) => g.id)).toEqual([
      "gols",
      "finalizacao",
      "criacao",
      "passe",
      "cruzamento",
      "pressao",
      "posse",
      "desarmes",
      "cabeceio",
      "disciplina",
      "fisico",
      "goleiro",
      "compostas",
      "atributos",
      "contrato",
    ]);
  });

  it("minSample is always a list of rules", () => {
    for (const s of STATS) if (s.minSample !== undefined) expect(Array.isArray(s.minSample), s.key).toBe(true);
  });

  it("every minSample points at an unsampled stat in the catalog or at minutes", () => {
    for (const s of STATS)
      for (const rule of s.minSample ?? []) {
        if (rule.of === "minutes") continue;
        expect(() => statIndex(rule.of), s.key).not.toThrow();
        expect(STATS[statIndex(rule.of)].minSample ?? [], `${s.key} -> ${rule.of}`).toEqual([]);
      }
  });

  it("lowerIsBetter flags exactly the old six plus the new lower-is-better rates", () => {
    const oldSix = ["PossLost/90", "Fouls/90", "Yel/90", "Red/90", "Off/90", "Conc/90"];
    const flagged = STATS.filter((s) => s.lowerIsBetter).map((s) => s.key);
    expect(flagged.filter((k) => LEGACY_STAT_KEYS.includes(k)).sort()).toEqual([...oldSix].sort());
    expect(flagged.filter((k) => !LEGACY_STAT_KEYS.includes(k)).sort()).toEqual(
      ["Mins/Ast", "Mins/Gl", "Red/Tck", "Yel/Tck"].sort(),
    );
  });
});

describe("deriveAll", () => {
  it("returns one column per stat, one value per record", () => {
    const cols = deriveAll([player(), player(), player()]);
    expect(cols).toHaveLength(STATS.length);
    for (const c of cols) expect(c).toBeInstanceOf(Float64Array);
    for (const c of cols) expect(c.length).toBe(3);
  });

  it("derive returns null for every per-90 stat when minutes is 0", () => {
    const cols = deriveAll([player({ season: { minutes: 0 } }), player({ season: null })]);
    const per90 = STATS.map((s, j) => [s, j] as const).filter(([s]) => s.unit === "per90" || s.unit === "km");
    expect(per90.length).toBeGreaterThan(40);
    for (const [s, j] of per90) expect([cols[j][0], cols[j][1]], s.key).toEqual([NaN, NaN]);
    for (const [j, s] of STATS.entries()) expect([cols[j][0], cols[j][1]], s.key).toEqual([NaN, NaN]);
  });

  it("ratio below minSample is null", () => {
    expect(value(player({ record: { hdr_att: 9, hdr_won: 5 } }), "Hdr%")).toBeNull();
    expect(value(player({ record: { hdr_att: 10, hdr_won: 5 } }), "Hdr%")).toBe(50);
  });

  it("applyMinSample false keeps legacy ratios at the old values but still guards new ones", () => {
    const r = player({ record: { hdr_att: 9, hdr_won: 3, pres_att: 9, pres_cmp: 3 } });
    expect(value(r, "Hdr%", { applyMinSample: false })).toBeCloseTo(100 / 3, 12);
    expect(value(r, "Pres%", { applyMinSample: false })).toBeNull();
  });

  it("Duels Win % needs 10 headers and 10 tackles attempted", () => {
    const duel = (hdr_att: number, tck_att: number) =>
      value(player({ record: { hdr_att, hdr_won: 5, tck_att, tck_won: 5 } }), "Duel%");
    expect(duel(9, 30)).toBeNull();
    expect(duel(30, 9)).toBeNull();
    expect(duel(10, 10)).toBe(50);
  });

  it("Asts/CCC needs 5 chances created and 1 assist", () => {
    const astCcc = (assists: number, ccc: number) =>
      value(player({ season: { assists }, record: { ccc } }), "Asts/CCC");
    expect(astCcc(1, 4)).toBeNull();
    expect(astCcc(0, 8)).toBeNull();
    expect(astCcc(2, 8)).toBe(0.25);
  });

  it("overperformance and minutes per goal come from the season totals", () => {
    const r = player({
      season: { minutes: 900, goals: 6, pens_scored: 2, assists: 3 },
      record: { xg100: 450, npxg100: 300, xa100: 200, shots: 30, sot: 12 },
    });
    expect(value(r, "xG-OP")).toBeCloseTo(1.5, 12);
    expect(value(r, "npxG-OP")).toBeCloseTo(1, 12);
    expect(value(r, "xA-OP")).toBeCloseTo(1, 12);
    expect(value(r, "Mins/Gl")).toBe(150);
    expect(value(r, "Mins/Ast")).toBe(300);
    expect(value(r, "Conv%")).toBe(20);
  });

  it("KP% and OP-KP% are key passes per pass attempted", () => {
    const r = player({ record: { pas_att: 300, kp: 15, op_kp: 9 } });
    expect(value(r, "KP%")).toBeCloseTo(5, 12);
    expect(value(r, "OP-KP%")).toBeCloseTo(3, 12);
  });

  it("Poss+-/90 is possession won minus lost per 90", () => {
    expect(value(player({ season: { minutes: 900 }, record: { poss_won: 50, poss_lost: 30 } }), "Poss+-/90")).toBe(2);
  });

  it("Poss+-% is won over won plus lost, from 90 minutes", () => {
    const poss = (minutes: number) =>
      value(player({ season: { minutes }, record: { poss_won: 50, poss_lost: 30 } }), "Poss+-%");
    expect(poss(900)).toBe(62.5);
    expect(poss(89)).toBeNull();
  });

  it("Pres% is successful pressures per pressure attempted", () => {
    expect(value(player({ record: { pres_att: 40, pres_cmp: 10 } }), "Pres%")).toBe(25);
  });

  it("TckQlty is tackles won per foul committed", () => {
    expect(value(player({ record: { tck_att: 20, tck_won: 12, fouls: 8 } }), "TckQlty")).toBe(1.5);
  });

  it("PrPass% is progressive passes per completed pass, from 10 completions", () => {
    const prPass = (pas_cmp: number, pr_passes: number) =>
      value(player({ record: { pas_att: 300, pas_cmp, pr_passes } }), "PrPass%");
    expect(prPass(240, 60)).toBe(25);
    expect(prPass(9, 3)).toBeNull();
    expect(prPass(10, 3)).toBeCloseTo(30, 12);
  });

  it("NetFouls/90 is fouls won minus fouls committed per 90", () => {
    expect(value(player({ season: { minutes: 900 }, record: { fouls_won: 30, fouls: 20 } }), "NetFouls/90")).toBe(1);
  });

  it("goalkeeper stats are empty for outfielders and outfield-only stats empty for keepers", () => {
    const keeper = player({
      pos: KEEPER_POS,
      season: { minutes: 900, conceded: 10, clean_sheets: 3 },
      record: { hdr_att: 20, hdr_won: 10, saves_tipped: 10, tck_att: 4, tck_won: 1 },
      keeper: { saves: 40, conceded: 10, minutes: 900, xgp100: 150, clean_sheets: 3 },
    });
    const outfielder = player({ record: { hdr_att: 20, hdr_won: 10, tck_att: 20, tck_won: 10 } });
    for (const s of STATS.filter((d) => d.gkOnly)) expect(value(outfielder, s.key), s.key).toBeNull();
    for (const s of STATS.filter((d) => d.outfieldOnly)) expect(value(keeper, s.key), s.key).toBeNull();
    expect(value(keeper, "Saves")).toBe(40);
    expect(value(keeper, "ShTA")).toBe(50);
    expect(value(keeper, "Sv%")).toBe(80);
    expect(value(keeper, "Saves/Conc")).toBe(4);
    expect(value(keeper, "PenSv%")).toBe(25);
    const split = ["Svh/90", "Svp/90", "Svt/90"].map((k) => value(keeper, k) ?? NaN);
    expect(split[0]).toBeCloseTo(2, 12);
    expect(split[0] + split[1] + split[2]).toBeCloseTo(value(keeper, "Saves/90") ?? NaN, 12);
  });

  it("a keeper with no minutes in save-data competitions has no save stats at all", () => {
    const r = player({
      pos: KEEPER_POS,
      season: { minutes: 180, conceded: 2 },
      keeper: { saves: 0, conceded: 0, minutes: 0, xgp100: 0, clean_sheets: 0 },
    });
    for (const key of ["Saves", "ShTA", "Saves/90", "Sv%", "Saves/Conc", "Svh/90"])
      expect(value(r, key), key).toBeNull();
    expect(value(r, "Conc/90")).toBe(1);
  });

  it("never yields a non-finite value", () => {
    const odd = player({
      season: { minutes: 3, starts: 0, subs: 0, goals: 2, pens_scored: 0 },
      record: { shots: 0, fouls: 0, tck_att: 12, tck_won: 4 },
    });
    for (const c of deriveAll([odd])) expect(Number.isNaN(c[0]) || Number.isFinite(c[0])).toBe(true);
  });
});

interface Golden {
  statKeys: string[];
  players: Record<string, { name: string; mins: number; s: (number | string | null)[] }>;
}

const decode = (v: number | string | null) => (v === null ? NaN : typeof v === "string" ? Number(v) : v);

const close = (a: number, b: number) =>
  Number.isNaN(b) ? Number.isNaN(a) : Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));

const missingFixtures = [GOLDEN, RAW].filter((f) => !fs.existsSync(f));

if (missingFixtures.length) console.warn(`SKIPPED parity with the old engine: missing ${missingFixtures.join(", ")}`);

describe.skipIf(missingFixtures.length > 0)("parity with the old engine (golden)", () => {
  let golden: Golden;
  let records: PlayerRecord[];

  beforeAll(() => {
    golden = JSON.parse(fs.readFileSync(GOLDEN, "utf8")) as Golden;
    records = (JSON.parse(fs.readFileSync(RAW, "utf8")) as Snapshot).players;
  }, 120_000);

  it("derive matches old to_row/derive for shared stats", () => {
    const cols = deriveAll(records, { applyMinSample: false });
    expect(golden.statKeys).toEqual([...LEGACY_STAT_KEYS]);
    const row = new Map(records.map((r, i) => [String(r.uid), i]));
    const legacyCols = golden.statKeys.map((k) => cols[statIndex(k)]);
    const mismatches: string[] = [];
    let compared = 0;
    for (const [uid, p] of Object.entries(golden.players)) {
      const i = row.get(uid);
      if (i === undefined) {
        mismatches.push(`${uid} missing from the snapshot`);
        continue;
      }
      compared++;
      golden.statKeys.forEach((k, j) => {
        const want = decode(p.s[j]);
        const got = legacyCols[j][i];
        if (!close(got, want)) mismatches.push(`${uid} ${p.name} ${k}: got ${got}, want ${want}`);
      });
    }

    expect(compared).toBeGreaterThan(30_000);
    expect(mismatches.slice(0, 20)).toEqual([]);
    expect(mismatches).toHaveLength(0);
  });
});
