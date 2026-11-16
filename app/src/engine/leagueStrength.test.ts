import { beforeAll, describe, expect, it } from "vitest";
import type { Snapshot } from "@/data/types";
import { DEFAULT_ENGINE_SETTINGS } from "./analysis/input";
import { minutesOf } from "./club";
import { defaultActionsPresets } from "./composites";
import { type AnalysisResult, runAnalysis } from "./index";
import { leagueKey } from "./league";
import {
  clubLeagueStrength,
  DEFAULT_LEAGUE_STRENGTH_OPTIONS,
  leagueFactors,
  leagueStrengthIndex,
  leagueStrengths,
} from "./leagueStrength";
import { POS_GROUPS } from "./positions";
import { loadRawSnapshot, missingRawSnapshot } from "./testing/oldEngine";
import { playerRecord, type RecordParts } from "./testing/records";

const list = (a: ArrayLike<number>) => Array.from(a);
const starters = (n: number, division: string | null, ca: number, parts: RecordParts = {}) =>
  Array.from({ length: n }, () => playerRecord({ division, ca, minutes: 1000, ...parts }));

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

describe("leagueFactors", () => {
  const strength = Float64Array.of(145, 108.75, 87, NaN);

  it("is the player's league strength over the strongest league's", () => {
    expect(list(leagueFactors(strength))).toEqual([1, 0.75, 0.6, 0.6]);
  });

  it("counts an unknown league as the weakest one", () => {
    expect(leagueFactors(strength)[3]).toBe(leagueFactors(strength)[2]);
  });

  it("leaves every player alone when no league has a strength", () => {
    expect(list(leagueFactors(Float64Array.of(NaN, NaN)))).toEqual([1, 1]);
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

  it("rates MFC's league and the save's leagues, and the league weight moves Performance", () => {
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

    const moved = list(result.perf).filter((v, i) => Number.isFinite(v) && v !== result.perfUnadjusted[i]).length;
    console.info(`players whose Performance the league weight moves: ${moved}`);
    expect(moved).toBeGreaterThan(1000);

    const examples = snapshot.players
      .map((r, i) => ({ r, i, perf: result.perfUnadjusted[i], adj: result.perf[i] }))
      .filter(({ r, perf, adj }) => minutesOf(r) >= 900 && Number.isFinite(perf) && Number.isFinite(adj))
      .sort((a, b) => Math.abs(b.adj - b.perf) - Math.abs(a.adj - a.perf));
    const line = ({ r, i, perf, adj }: (typeof examples)[number]) =>
      `${r.name} (${POS_GROUPS[result.group[i]]}, ${r.division}, força ${result.leagueStrength[i].toFixed(1)}): ${perf} → ${adj}`;
    const down = examples.filter((e) => e.adj < e.perf).slice(0, 3);
    console.info(`lowered most:\n${down.map(line).join("\n")}`);
    expect(down).toHaveLength(3);
    expect(examples.every((e) => e.adj <= e.perf + 1e-4)).toBe(true);
  });
});
