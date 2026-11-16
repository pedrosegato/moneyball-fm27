import { beforeAll, describe, expect, it } from "vitest";
import type { PlayerRecord } from "@/data/types";
import { abilityAt } from "./ability";
import type { PercentileColumns } from "./composites";
import { STYLE_STATS } from "./data/groups";
import { type LegacyGroup, legacySlotGroup, positionSet } from "./positions";
import {
  DEFAULT_FIT_OPTIONS,
  type FitContext,
  type FitRow,
  type FitVerdict,
  FORMATIONS,
  fitContext,
  pickLineup,
  placePicks,
  tacticalFit,
} from "./tacticalFit";
import { loadOldEngine, missingOldEngineFixtures, nullOf, type OldEngineFixture } from "./testing/oldEngine";
import { playerRecord, type RecordParts } from "./testing/records";

const MY = 77;

describe("FORMATIONS", () => {
  it("keeps the old seven formations, slots back to front", () => {
    expect(Object.keys(FORMATIONS)).toEqual(["4-3-3", "4-2-3-1", "4-4-2", "4-1-4-1", "3-5-2", "3-4-3", "5-3-2"]);
    expect(FORMATIONS["4-3-3"]).toEqual([
      "GK",
      "D(L)",
      "D(C)",
      "D(C)",
      "D(R)",
      "DM",
      "M(C)",
      "M(C)",
      "AM(L)",
      "AM(R)",
      "ST(C)",
    ]);
    for (const slots of Object.values(FORMATIONS)) expect(slots).toHaveLength(11);
  });
});

describe("pickLineup", () => {
  const club = (position: string, minutes: number, parts: RecordParts = {}) =>
    playerRecord({ club_uid: MY, position, minutes, ...parts });
  const records = [
    club("GK", 1000),
    club("GK", 2000),
    club("D (C)", 500, { foot: "Left" }),
    club("D (C)", 1500),
    club("D (RLC)", 100),
    playerRecord({ club_uid: 5, position: "D (R)", minutes: 3000 }),
  ];
  const positions = records.map((r) => positionSet(r.position));
  const xiOf = (choice?: Parameters<typeof pickLineup>[4]) => pickLineup(records, positions, MY, "4-3-3", choice).xi;
  const none = Array<null>(6).fill(null);

  it("fills each slot with the most-played club player for it not already used", () => {
    expect(xiOf()).toEqual([1, 4, 3, 2, null, ...none]);
  });

  it("keeps a pick and leaves an emptied slot empty", () => {
    expect(xiOf({ picks: { 2: records[2].uid } })).toEqual([1, 4, 2, 3, null, ...none]);
    expect(xiOf({ picks: { 0: null } })).toEqual([null, 4, 3, 2, null, ...none]);
  });

  it("explicit slots replace the formation's", () => {
    const slots = ["GK", "D(R)", "D(C)", "D(C)", "D(L)", "AM(L)", "M(C)", "M(C)", "M(C)", "AM(R)", "ST(C)"];
    const lineup = pickLineup(records, positions, MY, "4-3-3", { slots, picks: { 2: records[2].uid } });
    expect(lineup.slots).toEqual(slots);
    expect(lineup.xi[2]).toBe(2);
  });

  it("slots that are not 11 known positions fall back to the formation", () => {
    const fallback = FORMATIONS["4-3-3"];
    const ten = fallback.slice(0, 10);
    const unknown = fallback.map((s, k) => (k === 3 ? "X(C)" : s));
    expect(pickLineup(records, positions, MY, "4-3-3", { slots: ten }).slots).toEqual(fallback);
    expect(pickLineup(records, positions, MY, "4-3-3", { slots: unknown }).slots).toEqual(fallback);
  });

  it("a stale pick leaves its slot empty", () => {
    expect(xiOf({ picks: { 0: 9999 } })).toEqual([null, 4, 3, 2, null, ...none]);
  });

  it("places the picks alone the way the lineup does: only a player at the club, once", () => {
    const [keeper, , left, , , away] = records.map((r) => r.uid);
    expect(placePicks(records, MY, 11, { 0: keeper, 1: away, 2: left, 3: left, 4: null })).toEqual([
      0,
      null,
      2,
      null,
      null,
      ...none,
    ]);

    const full = { ...Object.fromEntries(Array.from({ length: 11 }, (_, s) => [s, null])), 0: keeper, 2: left };
    expect(xiOf({ picks: full })).toEqual(placePicks(records, MY, 11, full));
  });

  it("without a club, nobody plays", () => {
    expect(pickLineup(records, positions, null).xi).toEqual(Array(11).fill(null));
  });

  it("an unknown formation falls back to 4-3-3", () => {
    expect(pickLineup(records, positions, MY, "9-0-1").slots).toEqual(FORMATIONS["4-3-3"]);
  });
});

interface Candidate {
  parts?: RecordParts;
  perf: number;
  x?: number;
  y?: number;
}

function fitCase(candidates: Candidate[], mine: Candidate | null = { perf: 50, x: 50, y: 50 }) {
  const all = mine ? [{ ...mine, parts: { club_uid: MY, ...mine.parts } }, ...candidates] : candidates;
  const records: PlayerRecord[] = all.map((c) => playerRecord({ position: "ST (C)", ...c.parts }));
  const pct: PercentileColumns = {
    x: Float32Array.from(all, (c) => c.x ?? NaN),
    y: Float32Array.from(all, (c) => c.y ?? NaN),
  };
  const ctx: FitContext<"A"> = fitContext({
    records,
    positions: records.map((r) => positionSet(r.position)),
    pct,
    keyStats: { A: ["x", "y"] },
    slotGroup: (slot) => (slot === "ST(C)" ? "A" : null),
    clubUid: MY,
  });
  const perf = { A: Float64Array.from(all, (c) => c.perf) };
  const offset = mine ? 1 : 0;
  const run = (slot: { pos?: string } = {}, opts = DEFAULT_FIT_OPTIONS, context = ctx) =>
    tacticalFit({ pos: "ST(C)", mine: mine ? 0 : null, ...slot }, context, perf, opts);
  const order = (rows: FitRow[]) => rows.map((r) => r.index - offset);
  return { ctx, run, order };
}

describe("tacticalFit", () => {
  it("defaults to the old thresholds, with my league or stronger", () => {
    expect(DEFAULT_FIT_OPTIONS).toEqual({
      lvl: 8,
      minMinutes: 900,
      poolMinutes: 300,
      styleMin: 60,
      leagueFilter: { kind: "myLeagueOrStronger" },
    });
  });

  it("ranks by the gap to your player, then by style match, with the verdict at ±lvl", () => {
    const { run, order } = fitCase([
      { perf: 70, x: 60, y: 60 },
      { perf: 55, x: 50, y: 50 },
      { perf: 42, x: 50, y: 50 },
      { perf: 58, x: 70, y: 70 },
      { perf: 70, x: 50, y: 50 },
      { perf: 90, x: 100, y: 100 },
      { perf: 90, x: 50 },
    ]);
    const rows = run();
    expect(order(rows)).toEqual([4, 0, 3, 1, 2]);
    expect(rows.map((r) => [r.perf, r.diff, r.style, r.verdict])).toEqual([
      [70, 20, 100, "upgrade"],
      [70, 20, 90, "upgrade"],
      [58, 8, 80, "upgrade"],
      [55, 5, 100, "replacement"],
      [42, -8, 100, "downgrade"],
    ]);
  });

  it("lvl and the style minimum are settings", () => {
    const { run } = fitCase([{ perf: 58, x: 70, y: 70 }]);
    expect(run({}, { ...DEFAULT_FIT_OPTIONS, lvl: 9 })[0].verdict).toBe("replacement");
    expect(run({}, { ...DEFAULT_FIT_OPTIONS, styleMin: 81 })).toEqual([]);
  });

  it("leaves out the club, youth, short minutes, other positions, weaker leagues and missing performance", () => {
    const { run, order } = fitCase([
      { parts: { club_uid: MY }, perf: 60, x: 50, y: 50 },
      { parts: { owner_uid: MY, owner: "Nós" }, perf: 60, x: 50, y: 50 },
      { parts: { team: "U21" }, perf: 60, x: 50, y: 50 },
      { parts: { minutes: 899 }, perf: 60, x: 50, y: 50 },
      { parts: { position: "D (C)" }, perf: 60, x: 50, y: 50 },
      { parts: { division: "Sky Bet Championship" }, perf: 60, x: 50, y: 50 },
      { perf: NaN, x: 50, y: 50 },
      { perf: 60, x: 50, y: 50 },
    ]);
    expect(order(run())).toEqual([7]);
    expect(order(run({}, { ...DEFAULT_FIT_OPTIONS, leagueFilter: { kind: "any" } }))).toEqual([5, 7]);
  });

  it("takes seniority and your league from the context, which fitContext reads once from the records", () => {
    const { ctx, run, order } = fitCase([
      { parts: { team: "U21" }, perf: 60, x: 50, y: 50 },
      { parts: { division: "Sky Bet Championship" }, perf: 60, x: 50, y: 50 },
      { perf: 60, x: 50, y: 50 },
    ]);
    expect([Array.from(ctx.senior), ctx.clubLeague]).toEqual([[1, 0, 1, 1], "premier league"]);
    expect(order(run())).toEqual([2]);

    expect(order(run({}, DEFAULT_FIT_OPTIONS, { ...ctx, senior: Uint8Array.from([1, 1, 1, 0]) }))).toEqual([0]);
    expect(order(run({}, DEFAULT_FIT_OPTIONS, { ...ctx, clubLeague: "sky bet championship" }))).toEqual([1, 2]);
  });

  it("an empty slot ranks by performance, with no gap, style or verdict", () => {
    const { run, order } = fitCase([{ perf: 60, x: 0, y: 0 }, { perf: 80 }], null);
    const rows = run();
    expect(order(rows)).toEqual([1, 0]);
    expect(rows.map((r) => [r.diff, r.style, r.verdict])).toEqual([
      [NaN, NaN, null],
      [NaN, NaN, null],
    ]);
  });

  it("a slot with no group has no candidates", () => {
    const { run } = fitCase([{ perf: 60, x: 50, y: 50 }]);
    expect(run({ pos: "SW" })).toEqual([]);
  });
});

const OLD_VERDICT: Record<FitVerdict, string> = {
  upgrade: "Upgrade",
  replacement: "Replacement",
  downgrade: "Downgrade",
};

describe.skipIf(missingOldEngineFixtures("tactical fit"))("tactical fit on the fixture", () => {
  let fx: OldEngineFixture;
  beforeAll(() => {
    fx = loadOldEngine();
  }, 120_000);

  it("tacticalFit top10 equal per slot", () => {
    const { records } = fx;
    const positions = records.map((r) => positionSet(r.position));
    const golden = fx.golden.tacticalFit;
    const lineup = pickLineup(records, positions, fx.clubUid, golden.formation);
    const ctx: FitContext<LegacyGroup> = fitContext({
      records,
      positions,
      pct: fx.pct,
      keyStats: {
        GK: STYLE_STATS.GK,
        DEF: STYLE_STATS.ZAG,
        MID: STYLE_STATS.MC,
        AM: STYLE_STATS.MEI,
        ST: STYLE_STATS.ATA,
      },
      slotGroup: legacySlotGroup,
      clubUid: fx.clubUid,
    });
    const uid = (i: number | null) => (i === null ? null : String(records[i].uid));
    let compared = 0;
    const start = performance.now();
    const results = golden.slots.map((s) => tacticalFit({ pos: s.pos, mine: lineup.xi[s.slot] }, ctx, fx.perfBy));
    console.info(`tacticalFit for ${golden.slots.length} slots: ${(performance.now() - start).toFixed(1)} ms`);

    expect(golden.slots).toHaveLength(11);
    golden.slots.forEach((s, k) => {
      const mine = lineup.xi[s.slot];
      expect([s.slot, lineup.slots[s.slot], legacySlotGroup(s.pos), uid(mine)]).toEqual([
        s.slot,
        s.pos,
        s.group,
        s.mine,
      ]);
      if (mine !== null) {
        expect([s.slot, nullOf(fx.perfBy[s.group][mine]), nullOf(abilityAt(records[mine].attrs, s.pos))]).toEqual([
          s.slot,
          s.minePerf,
          s.mineAbility,
        ]);
      }
      const rows = results[k];
      expect([s.slot, rows.length]).toEqual([s.slot, s.candidates]);
      const top10 = rows.slice(0, 10).map((r) => ({
        uid: uid(r.index),
        perf: r.perf,
        diff: nullOf(r.diff),
        style: nullOf(r.style),
        verdict: r.verdict && OLD_VERDICT[r.verdict],
        ability: nullOf(abilityAt(records[r.index].attrs, s.pos)),
      }));
      expect(top10).toEqual(s.top10);
      compared += top10.length;
    });
    console.info(`tactical fit parity: ${compared} top-10 rows over ${golden.slots.length} slots`);
    expect(compared).toBeGreaterThanOrEqual(100);
  });
});
