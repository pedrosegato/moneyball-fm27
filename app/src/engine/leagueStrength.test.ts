import { beforeAll, describe, expect, it } from "vitest";
import type { PlayerRecord, Snapshot } from "@/data/types";
import { DEFAULT_ENGINE_SETTINGS } from "./analysis/input";
import { analyzeModel } from "./analysis/model";
import { prepareSnapshot } from "./analysis/prepare";
import { minutesOf } from "./club";
import { defaultActionsPresets } from "./composites";
import { type AnalysisResult, runAnalysis } from "./index";
import { leagueKey } from "./league";
import {
  adjustedPerformance,
  adjustedPerformances,
  clubLeagueStrength,
  DEFAULT_LEAGUE_STRENGTH_OPTIONS,
  leagueCoefficient,
  leagueStrengthIndex,
  leagueStrengths,
} from "./leagueStrength";
import { POS_GROUPS, type PosGroup } from "./positions";
import { loadRawSnapshot, missingRawSnapshot } from "./testing/oldEngine";
import { playerRecord, type RecordParts } from "./testing/records";

const list = (a: ArrayLike<number>) => Array.from(a);
const starters = (n: number, division: string | null, ca: number, parts: RecordParts = {}) =>
  Array.from({ length: n }, () => playerRecord({ division, ca, minutes: 1000, ...parts }));
const everyGroup = <T>(value: T) => Object.fromEntries(POS_GROUPS.map((g) => [g, value])) as Record<PosGroup, T>;

describe("leagueStrengthIndex", () => {
  it("defaults to 450 minutes, 15 starters and 10 starters' worth of shrinkage", () => {
    expect(DEFAULT_LEAGUE_STRENGTH_OPTIONS).toEqual({ minMinutes: 450, minStarters: 15, shrinkK: 10 });
  });

  it("strength is the mean CA of starters with shrinkage", () => {
    const players = [
      ...starters(20, "Liga A", 100),
      ...starters(20, "Liga B", 140),

      ...starters(10, "Liga A", 50, { minutes: 449 }),
    ];
    const index = leagueStrengthIndex(players);

    expect(index.get(leagueKey("Liga A"))).toEqual({ strength: (20 * 100 + 10 * 120) / 30, starters: 20 });
    expect(index.get(leagueKey("Liga B"))).toEqual({ strength: (20 * 140 + 10 * 120) / 30, starters: 20 });
    expect(
      leagueStrengthIndex(players, { ...DEFAULT_LEAGUE_STRENGTH_OPTIONS, shrinkK: 0 }).get(leagueKey("Liga A"))
        ?.strength,
    ).toBe(100);
  });

  it("small divisions get no strength", () => {
    const players = [
      ...starters(14, "Liga Pequena", 90),
      ...starters(15, "Liga Justa", 110),
      ...starters(30, null, 120),
    ];
    const index = leagueStrengthIndex(players);
    expect(index.has(leagueKey("Liga Pequena"))).toBe(false);
    expect(index.get(leagueKey("Liga Justa"))?.starters).toBe(15);
    expect([...index.keys()]).toEqual([leagueKey("Liga Justa")]);
  });

  it("counts senior teams only: B, youth and unnamed teams carry their parent club's league", () => {
    const seniors = starters(20, "Liga A", 100);
    const youth = [...starters(10, "Liga A", 60, { team: "U21" }), ...starters(5, "Liga A", 70, { team: null })];
    const index = leagueStrengthIndex([...seniors, ...youth]);
    expect(index.get(leagueKey("Liga A"))).toEqual({ strength: 100, starters: 20 });
    const strength = leagueStrengths([...seniors, ...youth], index);
    expect(strength[0]).toBe(100);
    expect(list(strength.subarray(20)).every(Number.isNaN)).toBe(true);
  });

  it("gives each senior player his league's strength, NaN for a league without one", () => {
    const players = [
      ...starters(20, "Liga A", 100),
      ...starters(3, "Liga Pequena", 90),
      playerRecord({ division: null }),
    ];
    const strength = leagueStrengths(players, leagueStrengthIndex(players));
    expect(strength[0]).toBeCloseTo((20 * 100 + (10 * (2000 + 270)) / 23) / 30, 10);
    expect([strength[20], strength[23]]).toEqual([NaN, NaN]);
  });
});

describe("clubLeagueStrength", () => {
  const MY = 77;
  const players = [
    ...starters(20, "Liga A", 100),
    ...starters(20, "Liga B", 140),
    ...starters(3, "Liga B", 120, { club_uid: MY }),
    playerRecord({ division: "Liga A", club_uid: MY, team: "U20" }),
  ];
  const index = leagueStrengthIndex(players);

  it("is the strength of the league most of my club's own players are in", () => {
    expect(clubLeagueStrength(players, index, MY)).toBe(index.get(leagueKey("Liga B"))!.strength);
  });

  it("is null without a club, or when its league has no strength", () => {
    expect(clubLeagueStrength(players, index, null)).toBeNull();
    const small = [...players, ...starters(5, "Liga Pequena", 90, { club_uid: 9 })];
    expect(clubLeagueStrength(small, leagueStrengthIndex(small), 9)).toBeNull();
  });
});

function noise(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1_664_525) + 1_013_904_223) >>> 0;
    return s / 2 ** 31 - 1;
  };
}

describe("leagueCoefficient", () => {
  const STRENGTHS = [90, 105, 120, 135, 150];

  function planted(n: number, parts: RecordParts = {}) {
    const next = noise(7);
    const players: PlayerRecord[] = [];
    const strength: number[] = [];
    const perf: number[] = [];
    for (let k = 0; k < n; k++) {
      const ca = 80 + ((k * 37) % 100);
      const s = STRENGTHS[k % STRENGTHS.length];
      players.push(playerRecord({ ca, minutes: 1000, ...parts }));
      strength.push(s);
      perf.push(40 + 0.8 * ca - 2 * s + 5 * next());
    }
    return { players, strength, perf, groups: players.map((): PosGroup => "ATA") };
  }

  const fitModel = ({ players, strength, perf, groups }: ReturnType<typeof planted>, poolMinutes = 300) =>
    leagueCoefficient(players, everyGroup(perf), strength, groups, { poolMinutes });

  it("coefficient recovers a planted league effect on synthetic data", () => {
    const coefficient = fitModel(planted(400));
    expect(coefficient).toBeGreaterThan(-2.2);
    expect(coefficient).toBeLessThan(-1.8);
  });

  it("pools every group into one fit", () => {
    const atk = planted(200);
    const def = planted(200);
    const groups = [...atk.groups, ...def.groups.map((): PosGroup => "ZAG")];
    const players = [...atk.players, ...def.players];
    const strength = [...atk.strength, ...def.strength];
    const perfAta = [...atk.perf, ...def.perf.map(() => NaN)];
    const perfZag = [...atk.perf.map(() => NaN), ...def.perf];
    const perf = { ...everyGroup([] as number[]), ATA: perfAta, ZAG: perfZag };
    const pooled = leagueCoefficient(players, perf, strength, groups, { poolMinutes: 300 });
    expect(pooled).toBeGreaterThan(-2.2);
    expect(pooled).toBeLessThan(-1.8);
  });

  it("fewer than 50 rows get no adjustment", () => {
    expect(fitModel(planted(49))).toBe(0);
    expect(fitModel(planted(50))).not.toBe(0);
  });

  it("fits on the pool players with a Performance, a strength and a CA", () => {
    const clean = planted(400);
    const noisy = planted(400);
    const next = noise(11);
    for (let k = 0; k < 200; k++) {
      const minutes = k % 4 === 0 ? 200 : 1000;
      noisy.players.push(playerRecord({ ca: k % 4 === 1 ? 0 : 120, minutes }));
      noisy.strength.push(k % 4 === 2 ? NaN : 150);
      noisy.perf.push(k % 4 === 3 ? NaN : 100 + 50 * next());
      noisy.groups.push("ATA");
    }
    expect(fitModel(noisy)).toEqual(fitModel(clean));

    expect(fitModel(noisy, 100)).not.toBeCloseTo(fitModel(clean), 3);
  });

  it("players who all share one league get no adjustment", () => {
    const one = planted(200);
    one.strength.fill(120);
    expect(fitModel(one)).toBe(0);
  });
});

describe("adjustedPerformance", () => {
  it("adjusted equals perf for players in my league", () => {
    expect(adjustedPerformance(63, 124, 124, -1.3)).toBe(63);
    expect(adjustedPerformance(63, 124, 124, 0.7)).toBe(63);
  });

  it("stronger league raises adjusted perf when coef < 0", () => {
    expect(adjustedPerformance(60, 150, 124, -1)).toBe(86);
    expect(adjustedPerformance(60, 100, 124, -1)).toBe(36);
  });

  it("is not clamped: sorting and thresholds see the full value", () => {
    expect(adjustedPerformance(90, 150, 124, -1)).toBe(116);
    expect(adjustedPerformance(10, 100, 124, -1)).toBe(-14);
  });

  it("keeps the plain value when the player's or my league's strength is unknown", () => {
    expect([
      adjustedPerformance(60, NaN, 124, -1),
      adjustedPerformance(60, 130, NaN, -1),
      adjustedPerformance(NaN, 130, 124, -1),
    ]).toEqual([60, 60, NaN]);
  });
});

describe("adjustedPerformances", () => {
  const perfBase = everyGroup(Float32Array.of(60, 60, 60, NaN));
  const strength = Float64Array.of(130.5, 124, NaN, 150);

  it("applies one coefficient to every group, unrounded", () => {
    const adjusted = adjustedPerformances(perfBase, strength, 124, -1);
    expect(list(adjusted.ATA)).toEqual([66.5, 60, 60, NaN]);
    expect(list(adjusted.GK)).toEqual(list(adjusted.ATA));
  });

  it("leaves Performance alone when my league has no strength", () => {
    const adjusted = adjustedPerformances(perfBase, strength, null, -1);
    expect(list(adjusted.ZAG)).toEqual([60, 60, 60, NaN]);
  });

  it("a league weight of 0 is no adjustment", () => {
    expect(list(adjustedPerformances(perfBase, strength, 124, 0).MC)).toEqual([60, 60, 60, NaN]);
  });
});

describe.skipIf(missingRawSnapshot("league strength"))("league strength on the fixture", () => {
  let snapshot: Snapshot;
  let result: AnalysisResult;

  beforeAll(() => {
    snapshot = loadRawSnapshot();
    const input = {
      snapshot,
      composites: defaultActionsPresets(),
      myClubUid: snapshot.my_clubs[0].uid,
      settings: DEFAULT_ENGINE_SETTINGS,
    };
    result = runAnalysis(input);
  }, 120_000);

  it("rates MFC's league and the save's leagues, and fits one coefficient", () => {
    const index = leagueStrengthIndex(snapshot.players);
    const byStrength = [...index].sort((a, b) => b[1].strength - a[1].strength);
    const show = ([key, { strength, starters }]: (typeof byStrength)[number]) =>
      `${key} ${strength.toFixed(1)} (${starters})`;
    console.info(
      `league strength: ${index.size} leagues; MFC ${result.myLeagueStrength?.toFixed(1)}\n` +
        `top 5: ${byStrength.slice(0, 5).map(show).join("; ")}\n` +
        `bottom 5: ${byStrength.slice(-5).map(show).join("; ")}`,
    );
    expect(result.myLeagueStrength).toBe(index.get(leagueKey("Brasileirão Assaí Série A"))!.strength);
    expect(index.size).toBeGreaterThan(100);

    const { poolMinutes } = DEFAULT_ENGINE_SETTINGS;
    const model = analyzeModel(prepareSnapshot(snapshot), {
      poolMinutes,
      leagueAdjustment: DEFAULT_ENGINE_SETTINGS.leagueAdjustment,
      myClubUid: snapshot.my_clubs[0].uid,
    });
    console.info(`Performance points per point of league strength, at equal CA: ${model.leagueCoefficient.toFixed(3)}`);
    expect(model.leagueCoefficient).toBeLessThan(0);
    const moved = list(result.perf).filter((v, i) => Number.isFinite(v) && v !== result.perfUnadjusted[i]).length;
    console.info(`players whose Performance the league weight moves: ${moved}`);
    expect(moved).toBeGreaterThan(1000);

    const examples = snapshot.players
      .map((r, i) => ({ r, i, perf: result.perfUnadjusted[i], adj: result.perf[i] }))
      .filter(({ r, perf, adj }) => minutesOf(r) >= 900 && Number.isFinite(perf) && Number.isFinite(adj))
      .sort((a, b) => Math.abs(b.adj - b.perf) - Math.abs(a.adj - a.perf));
    const line = ({ r, i, perf, adj }: (typeof examples)[number]) =>
      `${r.name} (${POS_GROUPS[result.group[i]]}, ${r.division}, força ${result.leagueStrength[i].toFixed(1)}): ${perf} → ${adj}`;
    const up = examples.filter((e) => e.adj > e.perf).slice(0, 3);
    const down = examples.filter((e) => e.adj < e.perf).slice(0, 3);
    console.info(`raised most:\n${up.map(line).join("\n")}\nlowered most:\n${down.map(line).join("\n")}`);
    expect(up.length + down.length).toBe(6);
  });
});
