import { createHash } from "node:crypto";
import fs from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import type { Snapshot } from "@/data/types";
import { analysisColumns } from "./analysis/columns";
import { type AnalysisInput, DEFAULT_ENGINE_SETTINGS, type EngineSettings } from "./analysis/input";
import { analyzeModel, modelPercentiles } from "./analysis/model";
import { prepareSnapshot } from "./analysis/prepare";
import { NO_ROLE, roleScoringInput } from "./analysis/roles";
import { marketValue, minutesOf, monthsLeft, poolFlags, sampleSizes } from "./club";
import { POOL_HIDDEN_COLUMNS, percentileColumn } from "./columnIds";
import { type Composite, defaultActionsPresets, shrinkSmallSamples } from "./composites";
import { DEFAULT_VALUE_MODEL_OPTIONS } from "./fairValue";
import { type AnalysisResult, runAnalysis } from "./index";
import { leagueKey } from "./league";
import { leagueCoefficient, leagueStrengthIndex } from "./leagueStrength";
import { DEFAULT_MONEYBALL_OPTIONS } from "./moneyball";
import { rankPercentile, referenceOf } from "./percentiles";
import { mainGroup, POS_GROUPS, POS_NAMES, type PosGroup } from "./positions";
import { ROLES } from "./roles/catalog";
import { groupBest, scoreRoles } from "./roles/score";
import { DEFAULT_SELL_KEEP_OPTIONS } from "./sellKeep";
import { STATS, statIndex } from "./stats/catalog";
import { contextOf, FULL } from "./stats/context";
import { DEFAULT_FIT_OPTIONS, FORMATIONS } from "./tacticalFit";
import {
  loadRawSnapshot,
  missingOldEngineFixtures,
  missingRawSnapshot,
  OLD_ENGINE_GOLDEN,
  type OldEngineGolden,
} from "./testing/oldEngine";
import { playedRecord, playerRecord, snapshotOf } from "./testing/records";
import { applyFilters } from "./universe";

const MY = 77;
const ST = POS_NAMES.map((name) => (name === "ST" ? 20 : 1));
const range = (n: number, from = 1) => Array.from({ length: n }, (_, k) => from + k);
const list = (a: ArrayLike<number>) => Array.from(a);
const bytes = (a: ArrayBufferView) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");

function modelOutputs(r: AnalysisResult) {
  return {
    moneyball: bytes(r.moneyball),
    fair: bytes(r.fair),
    valueRatio: bytes(r.valueRatio),
    rank: bytes(r.rank),
    perf: bytes(r.perf),
    perfIn: POS_GROUPS.map((g) => bytes(r.perfIn[g])),
    abilityPct: bytes(r.abilityPct),
    statsVsAbility: bytes(r.statsVsAbility),
    sellKeep: r.sellKeep,
    fit: r.fit,
    lineup: r.lineup,
  };
}

const withoutCa = (snapshot: Snapshot): Snapshot => ({
  ...snapshot,
  players: snapshot.players.map((r) => ({ ...r, ca: NaN })),
});

describe("DEFAULT_ENGINE_SETTINGS", () => {
  it("holds every module's old defaults, with one percentile pool for all of them", () => {
    const { poolMinutes, fairValue, moneyball, sellKeep, fit, leagueWeights } = DEFAULT_ENGINE_SETTINGS;
    expect(poolMinutes).toBe(300);
    expect({ ...fairValue, poolMinutes }).toEqual(DEFAULT_VALUE_MODEL_OPTIONS);
    expect({ ...moneyball, poolMinutes, excludeClubUid: null }).toEqual(DEFAULT_MONEYBALL_OPTIONS);
    expect({ ...sellKeep, poolMinutes }).toEqual(DEFAULT_SELL_KEEP_OPTIONS);
    expect({ ...fit, poolMinutes }).toEqual(DEFAULT_FIT_OPTIONS);
    expect(leagueWeights).toEqual({});

    expect([fairValue, moneyball, sellKeep, fit].filter((o) => "poolMinutes" in o)).toEqual([]);
    expect("excludeClubUid" in moneyball).toBe(false);
    expect([DEFAULT_ENGINE_SETTINGS, fairValue, moneyball, sellKeep, fit, leagueWeights].every(Object.isFrozen)).toBe(
      true,
    );
  });
});

describe("runAnalysis populations", () => {
  const strikers = range(60).map((k) => {
    const minutes = k % 2 ? 1000 : 500;
    return playerRecord({
      pos: ST,
      minutes,
      record: playedRecord(1 + k / 10, minutes),
      season: { goals: (k * minutes) / 900 },
    });
  });

  const unplayed = playerRecord({ pos: ST, club_uid: MY, minutes: 0, age: 30 });
  const snapshot = snapshotOf([...strikers, unplayed]);
  const BEST = 59;
  const sample = sampleSizes(snapshot.players);
  const shrunkBest = (p: number) => Math.fround(50 + (p - 50) * Math.min(1, sample.minutes[BEST] / sample.full[BEST]));

  const run = (settings: EngineSettings = DEFAULT_ENGINE_SETTINGS, composites: Composite[] = []) =>
    runAnalysis({ snapshot, composites, myClubUid: MY, settings });

  it("ranks percentiles among the group's poolMinutes players", () => {
    const r = run();
    expect(r.pct["G/90"][BEST]).toBe(rankPercentile(59, 1, 60));
    expect(r.poolMinutes).toBe(300);

    const strict = run({ ...DEFAULT_ENGINE_SETTINGS, poolMinutes: 900 });
    expect([strict.pct["G/90"][BEST], strict.pct["G/90"][BEST - 1]]).toEqual([NaN, rankPercentile(29, 1, 30)]);
  });

  it("ranks Performance among the poolMinutes players, then shrinks it by minutes", () => {
    expect(run().perf[BEST]).toBe(shrunkBest(rankPercentile(59, 1, 60)));
    expect(run({ ...DEFAULT_ENGINE_SETTINGS, poolMinutes: 900 }).perf[BEST]).toBe(
      shrunkBest(rankPercentile(30, 1, 30)),
    );
    expect(run().perfIn.ATA[BEST]).toBe(run().perf[BEST]);
  });

  it("hands poolMinutes to Sell/Keep and Rank", () => {
    const tooFew = (r: AnalysisResult) => r.sellKeep[unplayed.uid].reasons[0];
    expect(tooFew(run())).toEqual({ kind: "tooFewMinutes", minMinutes: 300, ability: null });
    expect(tooFew(run({ ...DEFAULT_ENGINE_SETTINGS, poolMinutes: 900 }))).toMatchObject({ minMinutes: 900 });

    expect([run().rank[0], run().rank[1]]).toEqual([7 * 1.15, 7 * 1.15]);
    const strict = run({ ...DEFAULT_ENGINE_SETTINGS, poolMinutes: 900, leagueWeights: { "premier league": 1 } });
    expect([strict.rank[0], strict.rank[1]]).toEqual([7, NaN]);
  });

  it("ranks composites among the group's pool, with the keeper flags for one-sided ones", () => {
    const goals: Composite = { id: "goals", label: "Gols", kind: "percentileMean", weights: { "G/90": 1 } };
    const keeperGoals: Composite = { ...goals, id: "keeper-goals", kind: "weightedSum", gkOnly: true };
    const r = run(DEFAULT_ENGINE_SETTINGS, [goals, keeperGoals]);
    expect(list(r.composites.goals)).toEqual(list(shrinkSmallSamples(r.pct["G/90"], sample)));
    expect(r.compositePct.goals[BEST - 1]).toBe(rankPercentile(59, 1, 60));
    expect(r.compositePct.goals[BEST]).toBe(rankPercentile(52, 1, 60));
    expect(list(r.composites["keeper-goals"]).every(Number.isNaN)).toBe(true);
  });

  it("refuses a composite id that is already a column", () => {
    const goals: Composite = { id: "goals", label: "Gols", kind: "percentileMean", weights: { "G/90": 1 } };
    expect(() => run(DEFAULT_ENGINE_SETTINGS, [goals, goals])).toThrow(/"goals"/);
    expect(() => run(DEFAULT_ENGINE_SETTINGS, [{ ...goals, id: "G/90" }])).toThrow(/"G\/90"/);
    expect(() => run(DEFAULT_ENGINE_SETTINGS, [{ ...goals, id: "perf" }])).toThrow(/"perf"/);
    for (const id of ["leagueStrength"]) {
      expect(() => run(DEFAULT_ENGINE_SETTINGS, [{ ...goals, id }])).toThrow(`"${id}"`);
    }
  });

  it("filters on identity, stats, percentiles and scores, by column id", () => {
    const prepared = prepareSnapshot(snapshot);
    const r = run();
    const visible = (col: string, min: number) =>
      list(applyFilters(snapshot.players, analysisColumns(prepared, r), [{ col, kind: "range", min }]));
    const rows = (mask: number[]) => mask.flatMap((v, i) => (v ? [i] : []));
    expect(rows(visible("minutes", 900))).toEqual(range(30, 0).map((j) => 2 * j));
    expect(rows(visible("G/90", 5.95))).toEqual([BEST]);
    expect(rows(visible(percentileColumn("G/90"), rankPercentile(59, 1, 60)))).toEqual([BEST]);
    expect(rows(visible("perf", shrunkBest(rankPercentile(59, 1, 60))))).toEqual([46, 48, 50, 52, 54, 56, 58, BEST]);
  });

  it("gives Moneyball's ratio, Stats vs ability and contract months left, as columns a filter can name", () => {
    const fitted = { ...DEFAULT_ENGINE_SETTINGS, fairValue: { ...DEFAULT_ENGINE_SETTINGS.fairValue, minRows: 10 } };
    const r = run(fitted);
    const cols = analysisColumns(prepareSnapshot(snapshot), r);
    const i = BEST - 1;
    expect(Number.isFinite(r.fair[i])).toBe(true);
    expect(r.valueRatio[i]).toBe(r.fair[i] / 1_000_000);
    expect(r.statsVsAbility[i]).toBe(Math.fround(r.perf[i] - r.abilityPct[i]));

    expect(r.monthsLeft[i]).toBe(43);
    expect([cols.valueRatio(i), cols.statsVsAbility(i), cols.monthsLeft(i)]).toEqual([
      r.valueRatio[i],
      r.statsVsAbility[i],
      43,
    ]);

    const last = snapshot.players.length - 1;
    expect([r.valueRatio[last], r.statsVsAbility[last]]).toEqual([NaN, NaN]);
  });

  it("filters on Performance and what is built on it as the table shows them, blank under the pool", () => {
    const fitted = { ...DEFAULT_ENGINE_SETTINGS.fairValue, minRows: 10 };
    const strict = run({ ...DEFAULT_ENGINE_SETTINGS, poolMinutes: 900, fairValue: fitted });
    const cols = analysisColumns(prepareSnapshot(snapshot), strict);
    const scores = ["perf", "fair", "valueRatio", "statsVsAbility"] as const;
    const kept = [strict.perf[BEST], strict.perfIn.ATA[BEST], strict.fair[BEST]];
    expect(kept.every(Number.isFinite)).toBe(true);
    expect(scores.map((id) => cols[id](BEST))).toEqual(scores.map(() => NaN));
    expect([...POOL_HIDDEN_COLUMNS].every((id) => Number.isNaN(Number(cols[id](BEST))))).toBe(true);
    expect(cols.perf(BEST - 1)).toBe(strict.rolePerf[BEST - 1]);
    expect(cols.fair(BEST - 1)).toBe(strict.fair[BEST - 1]);
  });

  it("has one Performance column, the role view, with no per-group or per-role duplicate", () => {
    const r = run();
    const cols = analysisColumns(prepareSnapshot(snapshot), r);
    expect(Object.keys(cols).filter((id) => id.startsWith("perf-") || id === "rolePerf")).toEqual([]);
    const shown = range(BEST, 0).filter((i) => Number.isFinite(r.rolePerf[i]));
    expect(shown.length).toBeGreaterThan(0);
    for (const i of shown) expect(r.rolePerf[i]).toBe(r.perf[i]);
  });

  it("gives each stat the median and top-5% value of the group's pool, what percentiles 50 and 95 stand for", () => {
    const ata = POS_GROUPS.indexOf("ATA");
    const { median, top } = referenceOf(run().reference, "G/90", ata);

    expect(median).toBeCloseTo(3.05, 10);
    expect(top).toBeCloseTo(5.7 + 0.05 * 0.1, 10);

    expect(
      referenceOf(run({ ...DEFAULT_ENGINE_SETTINGS, poolMinutes: 900 }).reference, "G/90", ata).median,
    ).toBeCloseTo(3, 10);
    expect(Object.keys(run().reference)).toEqual(STATS.map((d) => d.key));
  });

  it("filters on the market value the table shows, without the game's 'no valuation' sentinels", () => {
    const valued = snapshotOf([
      playerRecord({ value: 0 }),
      playerRecord({ value: 300_000_000 }),
      playerRecord({ value: 0xffff_ffff }),
      playerRecord({ value: 2_000_000 }),
    ]);
    const { columns } = prepareSnapshot(valued);
    expect([0, 1, 2, 3].map((i) => columns.marketValue(i))).toEqual([NaN, NaN, NaN, 2_000_000]);
    expect(
      list(applyFilters(valued.players, columns, [{ col: "marketValue", kind: "range", max: 8_000_000 }])),
    ).toEqual([0, 0, 0, 1]);
  });

  it("keeps the main group as an index into POS_GROUPS", () => {
    const r = run();
    expect(list(r.group).map((g) => POS_GROUPS[g])).toEqual(snapshot.players.map((p) => mainGroup(p.pos)));
  });
});

describe("display percentiles by position group", () => {
  const rated = (best: (typeof POS_NAMES)[number]) => POS_NAMES.map((name) => (name === best ? 20 : 1));

  const strikers = range(25, 0).map((k) => playerRecord({ pos: ST, season: { goals: k } }));
  const defenders = range(25, 0).map((k) => playerRecord({ pos: rated("DC"), season: { goals: k / 5 } }));

  const passing = { ...playerRecord().record, pas_att: 300, pas_cmp: 250 };
  const keepers = range(25, 0).map((k) =>
    playerRecord({
      pos: rated("GK"),
      season: { goals: k === 24 ? 1 : 0 },
      record: passing,
      keeper: { saves: 20 + k, conceded: 20, minutes: 1000, xgp100: 0, clean_sheets: 3 },
    }),
  );
  const midfielders = range(5, 0).map((k) => playerRecord({ pos: rated("DM"), season: { goals: k } }));
  const benched = playerRecord({ pos: ST, minutes: 200, season: { goals: 5 } });
  const players = [...strikers, ...defenders, ...keepers, ...midfielders, benched];
  const snapshot = snapshotOf(players);
  const goals: Composite = { id: "goals", label: "Gols", kind: "weightedSum", weights: { "G/90": 1 } };
  const r = runAnalysis({ snapshot, composites: [goals], myClubUid: null, settings: DEFAULT_ENGINE_SETTINGS });
  const [BEST_ATA, BEST_ZAG, BEST_GK, BENCHED] = [24, 49, 74, players.length - 1];
  const side = (g: PosGroup) => POS_GROUPS.indexOf(g);

  it("ranks each player against his own group's pool", () => {
    expect(r.pct["G/90"][BEST_ATA]).toBe(rankPercentile(24, 1, 25));
    expect(r.pct["G/90"][0]).toBe(rankPercentile(0, 1, 25));

    expect(r.pct["G/90"][BEST_ZAG]).toBe(rankPercentile(24, 1, 25));
    expect(r.compositePct.goals[BEST_ZAG]).toBe(rankPercentile(24, 1, 25));
  });

  it("keepers never meet outfield players", () => {
    expect(r.pct["G/90"][BEST_GK]).toBe(rankPercentile(24, 1, 25));
    expect(r.pct["Sv%"][BEST_GK]).toBe(rankPercentile(24, 1, 25));
    expect([r.cols["Sv%"][BEST_ATA], r.pct["Sv%"][BEST_ATA]]).toEqual([NaN, NaN]);
  });

  it("a group with fewer than 20 in the pool has no percentiles, and keeps its values", () => {
    const vol = players.flatMap((_, i) => (POS_GROUPS[r.group[i]] === "VOL" ? [i] : []));
    expect(vol).toHaveLength(5);
    expect(vol.every((i) => Number.isNaN(r.pct["G/90"][i]) && !Number.isNaN(r.cols["G/90"][i]))).toBe(true);
    expect(vol.every((i) => r.pool[i] === 1)).toBe(true);
  });

  it("a player under the pool minutes has no percentile, and keeps his raw value", () => {
    expect(r.pool[BENCHED]).toBe(0);
    expect(r.cols["G/90"][BENCHED]).toBeCloseTo(2.25, 10);
    expect(r.pct["G/90"][BENCHED]).toBeNaN();
    expect(r.compositePct.goals[BENCHED]).toBeNaN();
    expect(r.composites.goals[BENCHED]).toBeCloseTo(2.25, 5);

    expect(r.pct["G/90"][BEST_ATA]).toBe(rankPercentile(24, 1, 25));
  });

  it("references are per group", () => {
    const of = (g: PosGroup) => referenceOf(r.reference, "G/90", side(g)).median;
    expect(of("ATA")).toBeCloseTo(12 * 0.09, 10);
    expect(of("ZAG")).toBeCloseTo((12 / 5) * 0.09, 10);
    expect(of("VOL")).toBeNaN();
  });
});

describe("Performance adjusted to my league", () => {
  const SERIE_A = "Brasileirão Assaí Série A";

  const LEAGUES = [
    ["Premier League", 150],
    [SERIE_A, 120],
    ["Liga Profesional de Fútbol", 90],
  ] as const;
  const players = LEAGUES.flatMap(([division, ca], l) =>
    range(60, 0).map((k) => {
      const minutes = k % 5 ? 1000 : 500;
      return playerRecord({
        pos: ST,
        division,
        ca: ca + (k % 21) - 10,
        minutes,
        age: 19 + (k % 14),
        value: 500_000 * (1 + ((k * 7) % 11)),
        club_uid: division === SERIE_A && k < 12 ? MY : 1 + l,
        record: playedRecord(1 + ((k * 13 + l * 7) % 60) / 10, minutes),
        season: { goals: (((k * 13 + l * 7) % 60) * minutes) / 900 },
      });
    }),
  );
  const snapshot = snapshotOf(players);
  const run = (s: Snapshot = snapshot, myClubUid: number | null = MY, leagueAdjustment = 1) =>
    runAnalysis({
      snapshot: s,
      composites: [],
      myClubUid,
      settings: { ...DEFAULT_ENGINE_SETTINGS, leagueAdjustment },
    });
  const result = run();
  const inLeague = (division: string) => players.flatMap((r, i) => (r.division === division ? [i] : []));

  it("a league weight of 0 gives the model outputs of a save without league strength; a weight of 1 moves them", () => {
    const absent = run(withoutCa(snapshot));
    expect(absent.myLeagueStrength).toBeNull();
    expect(list(absent.perf)).toEqual(list(absent.perfUnadjusted));

    expect(result.moneyball.length).toBeGreaterThan(0);
    expect(Object.keys(result.sellKeep).length).toBe(12);
    expect(modelOutputs(run(snapshot, MY, 0))).toStrictEqual(modelOutputs(absent));
    expect(modelOutputs(result)).not.toStrictEqual(modelOutputs(absent));
  });

  it("orders the players again after the league weight, so Performance stays a 0–100 rank", () => {
    const mean = (r: AnalysisResult, ids: number[]) => {
      const valued = ids.filter((i) => Number.isFinite(r.perf[i]));
      return valued.reduce((sum, i) => sum + r.perf[i], 0) / valued.length;
    };
    const strong = inLeague("Premier League");
    const [off, one, two, three] = [0, 1, 2, 3].map((m) => run(snapshot, MY, m));
    expect(list(off.perf)).toEqual(list(off.perfUnadjusted));
    for (const r of [one, two, three])
      expect([...r.perf].every((v) => Number.isNaN(v) || (v >= 0 && v <= 100))).toBe(true);
    const moved = (r: AnalysisResult) => mean(r, strong) - mean(off, strong);
    expect(moved(one)).not.toBe(0);
    expect(Math.sign(moved(three))).toBe(Math.sign(moved(one)));
    expect(Math.abs(moved(three))).toBeGreaterThanOrEqual(Math.abs(moved(one)));
  });

  it("gives each player his league's strength and the analysis my league's", () => {
    const index = leagueStrengthIndex(players);
    const strength = (division: string) => index.get(leagueKey(division))!.strength;
    expect(result.myLeagueStrength).toBe(strength(SERIE_A));
    expect(inLeague("Premier League").every((i) => result.leagueStrength[i] === strength("Premier League"))).toBe(true);
    expect(strength("Premier League")).toBeGreaterThan(strength(SERIE_A));
  });

  it("moves the stronger league and mine apart in the order", () => {
    const shift = (division: string) => {
      const ids = inLeague(division).filter((i) => Number.isFinite(result.perf[i]));
      return ids.reduce((sum, i) => sum + result.perf[i] - result.perfUnadjusted[i], 0) / ids.length;
    };
    expect(inLeague(SERIE_A).filter((i) => Number.isFinite(result.perfIn.ATA[i])).length).toBeGreaterThan(40);
    expect(Math.sign(shift("Premier League") - shift(SERIE_A))).not.toBe(0);
  });

  it("without a club there is no league of mine, so Performance is not adjusted", () => {
    const anon = run(snapshot, null);
    expect(anon.myLeagueStrength).toBeNull();
    expect(list(anon.perf)).toEqual(list(anon.perfUnadjusted));
    expect(list(anon.leagueStrength)).toEqual(list(result.leagueStrength));
  });

  it("filters on the adjusted Performance, with no separate Perf. aj. column, and on league strength", () => {
    const prepared = prepareSnapshot(snapshot);
    const cols = analysisColumns(prepared, result);
    const i = inLeague("Premier League")[1];
    expect(cols.perf(i)).toBe(result.perf[i]);
    expect(cols.perfAdj).toBeUndefined();
    expect(cols["perfAdj-ATA"]).toBeUndefined();
    expect(prepared.columns.leagueStrength(i)).toBe(result.leagueStrength[i]);
    const strong = applyFilters(players, cols, [
      { col: "leagueStrength", kind: "range", min: result.leagueStrength[i] },
    ]);
    expect(list(strong).flatMap((v, k) => (v ? [k] : []))).toEqual(inLeague("Premier League"));
  });

  it("shrinks the small samples in Performance but fits the league coefficient on the unshrunk one", () => {
    const prepared = prepareSnapshot(snapshot);
    const model = analyzeModel(prepared, {
      poolMinutes: DEFAULT_ENGINE_SETTINGS.poolMinutes,
      leagueAdjustment: 1,
      myClubUid: MY,
    });
    const poolMinutes = DEFAULT_ENGINE_SETTINGS.poolMinutes;
    const unshrunk = groupBest(scoreRoles(roleScoringInput(prepared, poolMinutes)));
    const full = prepared.sample.full;
    const short = players.flatMap((r, i) => (minutesOf(r) === 500 && Number.isFinite(unshrunk.ATA[i]) ? [i] : []));
    expect(short.length).toBeGreaterThan(5);
    for (const i of short) {
      expect(model.perfBase.ATA[i]).toBeCloseTo(50 + (unshrunk.ATA[i] - 50) * (500 / full[i]), 4);
    }
    const regular = players.flatMap((r, i) => (minutesOf(r) === 1000 && Number.isFinite(unshrunk.ATA[i]) ? [i] : []));
    for (const i of regular) {
      expect(model.perfBase.ATA[i]).toBeCloseTo(50 + (unshrunk.ATA[i] - 50) * Math.min(1, 1000 / full[i]), 4);
    }
    const expected = leagueCoefficient(prepared.records, unshrunk, prepared.result.leagueStrength, prepared.groups, {
      poolMinutes,
    });
    expect(model.leagueCoefficient).toBe(expected);
  });

  it("is fitted with the model: the percentiles, Performance and the adjustment come from one stage", () => {
    const prepared = prepareSnapshot(snapshot);
    const model = analyzeModel(prepared, {
      poolMinutes: DEFAULT_ENGINE_SETTINGS.poolMinutes,
      leagueAdjustment: 1,
      myClubUid: MY,
    });
    expect(model.leagueCoefficient).not.toBe(0);
    expect(model.myLeagueStrength).toBe(result.myLeagueStrength);
    expect(list(model.perfBase.ATA)).toEqual(list(result.perfUnadjusted));
    expect(list(model.perfIn.ATA)).toEqual(list(result.perfIn.ATA));
  });
});

describe.skipIf(missingRawSnapshot("runAnalysis"))("runAnalysis on the fixture", () => {
  let snapshot: Snapshot;
  let input: AnalysisInput;
  let result: AnalysisResult;
  let mfc: number;

  beforeAll(() => {
    snapshot = loadRawSnapshot();
    mfc = snapshot.my_clubs[0].uid!;
    input = { snapshot, composites: defaultActionsPresets(), myClubUid: mfc, settings: DEFAULT_ENGINE_SETTINGS };
    result = runAnalysis(input);
  }, 120_000);

  it("runAnalysis on fixture returns 45985 uids and 30631 with minutes", () => {
    const n = 45_985;
    expect(result.uids).toHaveLength(n);
    expect(list(result.uids.subarray(0, 3))).toEqual(snapshot.players.slice(0, 3).map((r) => r.uid));
    const played = snapshot.players.map((r) => minutesOf(r) > 0);
    expect(played.filter(Boolean)).toHaveLength(30_631);

    const g90 = result.cols["G/90"];
    expect(played.every((p, i) => p === !Number.isNaN(g90[i]))).toBe(true);
    expect(Object.keys(result.cols)).toEqual(STATS.map((d) => d.key));
    expect(Object.keys(result.pct)).toEqual(STATS.map((d) => d.key));
    const columns = [
      ...Object.values(result.cols),
      ...Object.values(result.pct),
      ...Object.values(result.composites),
      ...Object.values(result.compositePct),
      ...Object.values(result.perfIn),
      result.perf,
      result.group,
      result.fair,
      result.ability,
      result.vsAge,
      result.rating,
      result.rank,
      result.abilityPct,
      result.leagueStrength,
    ];
    expect(columns.filter((c) => c.length !== n)).toEqual([]);
  });

  it("scores the Actions/90 per side of the keeper line", () => {
    const keeper = list(result.group).map((g) => POS_GROUPS[g] === "GK");
    const valued = (id: string) => list(result.composites[id]).flatMap((v, i) => (Number.isNaN(v) ? [] : [i]));
    expect(valued("actions-gk").length).toBeGreaterThan(500);
    expect(valued("actions-gk").every((i) => keeper[i])).toBe(true);
    expect(valued("actions-def").every((i) => !keeper[i])).toBe(true);
  });

  it("role scores on the fixture: Central Pragmático spans 0–100 among pool centre-backs, keepers have no outfield role, and 90% of pool outfielders with full detail have a best role", () => {
    const { poolMinutes, leagueAdjustment } = DEFAULT_ENGINE_SETTINGS;
    const prepared = prepareSnapshot(snapshot);
    const model = analyzeModel(prepared, { poolMinutes, leagueAdjustment, myClubUid: mfc });
    const roleScores = model.roles;
    const pool = poolFlags(snapshot.players, poolMinutes);
    const group = list(result.group).map((g) => POS_GROUPS[g]);
    const ncb = ROLES.findIndex((r) => r.id === "ip:29");
    const scored = (i: number) => pool[i] && group[i] === "ZAG" && !Number.isNaN(roleScores[ncb][i]);
    const values = snapshot.players.flatMap((_, i) => (scored(i) ? [roleScores[ncb][i]] : []));
    expect(values.length).toBeGreaterThan(300);
    expect(Math.min(...values)).toBeLessThan(5);
    expect(Math.max(...values)).toBeGreaterThan(95);
    const keepers = group.flatMap((g, i) => (g === "GK" ? [i] : []));
    expect(
      keepers.every((i) => ROLES.every((r, k) => r.profile === "goleiros" || Number.isNaN(roleScores[k][i]))),
    ).toBe(true);
    const outfield = snapshot.players.flatMap((r, i) =>
      pool[i] && group[i] !== "GK" && contextOf(r).detail === FULL ? [i] : [],
    );
    const withRole = outfield.filter((i) => result.roleShown[i] !== NO_ROLE).length;
    expect(withRole / outfield.length).toBeGreaterThan(0.9);
  });

  it("judges MFC: a Sell/Keep verdict per contracted player, eleven fit slots, a Moneyball list without MFC", () => {
    const at = new Map(snapshot.players.map((r, i) => [r.uid, i]));
    expect(Object.keys(result.sellKeep)).toHaveLength(33);
    expect(result.lineup.slots).toEqual(FORMATIONS["4-3-3"]);
    expect(result.fit).toHaveLength(11);
    expect(result.fit.every((rows) => rows.length > 50)).toBe(true);
    expect(result.moneyball.length).toBeGreaterThan(200);
    const owners = (uid: number) => {
      const r = snapshot.players[at.get(uid)!];
      return [r.club_uid, r.owner_uid];
    };
    expect(list(result.moneyball).filter((uid) => owners(uid).includes(mfc))).toEqual([]);
    expect(list(result.moneyball).every((uid) => result.fair[at.get(uid)!] > 0)).toBe(true);
  });

  it("lists Moneyball in the order of the ratio the table sorts it by, every one at or above the minimum", () => {
    const at = new Map(snapshot.players.map((r, i) => [r.uid, i]));
    const ratios = list(result.moneyball).map((uid) => result.valueRatio[at.get(uid)!]);
    expect(ratios.every((x) => x >= DEFAULT_ENGINE_SETTINGS.moneyball.minRatio)).toBe(true);
    expect(ratios).toEqual([...ratios].sort((a, b) => b - a));
    const i = at.get(result.moneyball[0])!;
    expect(result.valueRatio[i]).toBe(result.fair[i] / marketValue(snapshot.players[i]));
    expect(result.monthsLeft[i]).toBe(monthsLeft(snapshot.players[i], snapshot.date));
  });

  describe.skipIf(missingOldEngineFixtures("runAnalysis vs the old engine"))("against the old engine (golden)", () => {
    let golden: OldEngineGolden;
    beforeAll(() => {
      golden = JSON.parse(fs.readFileSync(OLD_ENGINE_GOLDEN, "utf8")) as OldEngineGolden;
    }, 120_000);

    it("ranks the model percentiles on the old pool: every untied value equals the golden", () => {
      const model = modelPercentiles(prepareSnapshot(snapshot), DEFAULT_ENGINE_SETTINGS.poolMinutes);
      const pool = snapshot.players.map((r) => (minutesOf(r) >= 300 ? 1 : 0));
      const isGk = list(result.group).map((g) => (POS_GROUPS[g] === "GK" ? 1 : 0));
      const mismatches: string[] = [];
      let compared = 0;

      for (const key of Object.keys(model).filter((k) => !STATS[statIndex(k)].minSample?.length)) {
        const k = golden.statKeys.indexOf(key);
        const values = result.cols[key];
        const seen = [new Map<number, number>(), new Map<number, number>()];
        values.forEach((v, i) => {
          if (pool[i] && !Number.isNaN(v)) seen[isGk[i]].set(v, (seen[isGk[i]].get(v) ?? 0) + 1);
        });
        snapshot.players.forEach((r, i) => {
          const want = golden.players[String(r.uid)]?.pct[k];

          if (want == null || (seen[isGk[i]].get(values[i]) ?? 0) - pool[i] > 0) return;
          compared++;
          if (model[key][i] !== want) mismatches.push(`${r.uid} ${key}: ${model[key][i]} vs ${want}`);
        });
      }
      console.info(`model percentiles vs golden: ${compared} untied values, ${mismatches.length} mismatches`);
      expect(compared).toBeGreaterThan(100_000);
      expect(mismatches.slice(0, 10)).toEqual([]);
    });

    it("keeps at least seven tenths of the old Moneyball list", () => {
      const want = golden.moneyball.rows.map((r) => Number(r.uid));
      const listed = new Set(result.moneyball);
      const common = want.filter((uid) => listed.has(uid)).length;
      console.info(`Moneyball: ${result.moneyball.length} listed, golden ${want.length}, ${common} in common`);
      expect(want).toHaveLength(349);
      expect(common).toBeGreaterThanOrEqual(0.7 * want.length);
    });
  });

  it("the models give today's numbers: Performance shrunk by minutes and weighted by league, every other model output follows it", () => {
    const TODAY = {
      moneyball: "9ea5c242ab18ee1661afecec1c5d299a9897040b14bfebc0f83881f6085d2e0d",
      fair: "ace6c7b3811c46f87d13a27727a2dbb9de990f4a99f619f1c2d70c99443abc3c",
      valueRatio: "4e92c30ac64be9c490202dbc0466968b12f80b5917d3a0a11cb79a7df966240d",
      rank: "c053ce15f76c7db6eef1521327ebc6c4875428545f0c4e08943e86ea2778abd1",
      perf: "7da9e98ed579ec668beb4cb0a9331cac44e9c5c9184b024df2c2515b6e127b8e",
      perfIn: "0ee15fc6642a7057dc366beff844c8c7bacc84d273d30c2d4916d5ea6e9aa580",
      abilityPct: "4e67d3d1e2e62f6292217626947abf7173c51537bb1b7670b08c306c959e4b00",
      statsVsAbility: "b9e004d3b98eb1270d3f6d4f92f17457d1da62ae610b56f7c0c27a04140de0a6",
      sellKeep: "e0b67155da680d0f11419dc8d5c465bab833487eec5b17be9aae5e746ed536e8",
      fit: "feb7cd3cbe757fb93a28e7b8961a675374ccfcca1029c51ac31c1b2d963b1c66",
      lineup: "7a86b04400888f4d4e241dba44aedc894cf14bec4eeb67c5a4719dd415ce4b1b",
    };
    const outputs: Record<keyof typeof TODAY, unknown> = modelOutputs(result);
    const digest = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
    expect(Object.fromEntries(Object.entries(outputs).map(([k, v]) => [k, digest(v)]))).toEqual(TODAY);
  });

  it("a league weight of 0 gives the outputs of a save without league strength on the fixture", () => {
    const absent = runAnalysis({ ...input, snapshot: withoutCa(snapshot) });
    const off = runAnalysis({ ...input, settings: { ...DEFAULT_ENGINE_SETTINGS, leagueAdjustment: 0 } });
    expect(result.myLeagueStrength).not.toBeNull();
    expect(absent.myLeagueStrength).toBeNull();
    expect(modelOutputs(off)).toStrictEqual(modelOutputs(absent));
  });

  it("without a club, has no lineup, fit or Sell/Keep, and no league weight on Performance", () => {
    const anon = runAnalysis({ ...input, myClubUid: null });
    expect(anon.lineup.xi.every((i) => i === null)).toBe(true);
    expect(anon.fit.every((rows) => rows.length === 0)).toBe(true);
    expect(anon.sellKeep).toEqual({});
    expect(list(anon.perf)).toEqual(list(result.perfUnadjusted));
    expect(anon.moneyball.length).toBeGreaterThan(0);
  });
});
