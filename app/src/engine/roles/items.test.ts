import { describe, expect, it } from "vitest";
import type { PlayerRecord } from "@/data/types";
import { playerRecord } from "../testing/records";
import { PROFILE_ITEMS, ROLE_ITEM_KEYS, ROLE_ITEMS, type RoleItemKey, roleItemColumns } from "./items";

const ZERO_POS = Array(15).fill(1);
const outfielder = playerRecord({
  minutes: 900,
  pos: ZERO_POS.map((v, i) => (i === 3 ? 20 : v)),
  season: { goals: 6, assists: 4, pens_taken: 2, pens_scored: 1, yellow: 3, red: 1, motm: 2 },
  record: {
    ...playerRecord().record,
    pas_att: 400,
    pas_cmp: 340,
    tck_att: 30,
    tck_won: 20,
    hdr_att: 50,
    hdr_won: 30,
    drb: 25,
    fouls: 12,
    fouls_won: 18,
    shots: 40,
    sot: 16,
    distance10: 1000,
    offsides: 5,
    kp: 20,
    tck_key: 4,
    hdr_key: 6,
    int: 15,
    ccc: 8,
    blocks: 7,
    poss_lost: 60,
    poss_won: 50,
    xg100: 550,
    xa100: 320,
    clr: 25,
    fk: 3,
    goals_out: 2,
    op_crs_att: 30,
    op_crs_cmp: 9,
    crs_att: 40,
    crs_cmp: 12,
    shots_blk: 5,
    pr_passes: 45,
    pres_att: 120,
    pres_cmp: 40,
    npxg100: 400,
    sprints: 100,
  },
});
const keeper = playerRecord({
  minutes: 900,
  pos: ZERO_POS.map((v, i) => (i === 0 ? 20 : v)),
  season: { conceded: 15, clean_sheets: 4, yellow: 1, motm: 3 },
  keeper: { saves: 60, conceded: 15, minutes: 900, xgp100: 250, clean_sheets: 4 },
  record: {
    ...playerRecord().record,
    hdr_att: 30,
    hdr_won: 20,
    saves_tipped: 10,
    tck_att: 4,
    tck_won: 1,
    pas_att: 300,
    pas_cmp: 210,
    pres_att: 10,
    pres_cmp: 4,
    poss_lost: 18,
  },
});
const value = (key: RoleItemKey, r: PlayerRecord) => ROLE_ITEMS.find((d) => d.key === key)?.compute(r);
const withRecord = (base: PlayerRecord, record: Partial<PlayerRecord["record"]>, rest: Partial<PlayerRecord> = {}) =>
  ({ ...base, ...rest, record: { ...base.record, ...record } }) as PlayerRecord;

it.each([
  ["aerialDominance", 1.03923],
  ["possWasted90", 10.2],
  ["cbDefEfficiency", 0.730816],
  ["defErrors90", 7.775],
  ["cbDuelSuccess", 0.45],
  ["cbContestWon", 0.616162],
  ["cbIntercepted90", 5.4],
  ["cbStolen90", 6.2],
  ["fbDefEfficiency", 0.703747],
  ["fbDefErrors90", 10.575],
  ["fbAttackSuccess", 0.759259],
  ["fbOverallSuccess", 0.735469],
  ["chancesCreated90", 4.32],
  ["fbInvolvement90", 63.4],
  ["fbStolen90", 4.3],
  ["dmCoverage", 1.136364],
  ["dmPhysical", 0.5],
  ["dmDefEfficiency", 0.763285],
  ["dmRecoveries90", 8.1],
  ["dmInterceptedStolen90", 11.4],
  ["dmContestWon", 0.586957],
  ["dmCreation90", 2.8],
  ["effort90", 71.333333],
  ["b2bActionSuccess", 0.672183],
  ["b2bRecovered90", 8.9],
  ["b2bLastThird90", 10.5],
  ["b2bInvolvement90", 57],
  ["flair", 1.398],
  ["ico", 26.25],
  ["dangerCreated90", 6.17],
  ["shotActions90", 6.12],
  ["ballActionSuccess", 0.608696],
  ["gpi", 1.8955],
  ["ipoIvo", 51.318],
  ["attEfficiency", 0.56338],
  ["fwdLastThird90", 22],
  ["scoringAttempts90", 7.52],
] as const)("%s matches the corrected sheet formula", (key, want) => {
  expect(value(key, outfielder)).toBeCloseTo(want, 5);
});

it.each([
  ["gkImpact", 14.427778],
  ["gkCriticalSaves", 1.066667],
  ["gkXgpShare", 0.142857],
  ["gkXpgRatio", 0.625],
  ["gkActionSuccess", 0.686823],
  ["gkSaveGap", -0.033333],
] as const)("keeper %s matches the corrected sheet formula", (key, want) => {
  expect(value(key, keeper)).toBeCloseTo(want, 5);
});

describe("gating", () => {
  it("keeper items are empty for outfielders and outfield items for keepers", () => {
    expect(value("gkImpact", outfielder)).toBeNull();
    expect(value("flair", keeper)).toBeNull();
  });

  it("outfield items need full detail", () => {
    const r = withRecord(outfielder, { distance10: 0, sprints: 0 }, { partial_detail: true });
    expect(value("flair", r)).toBeNull();
  });

  it("IDA needs 10 headers", () => {
    expect(value("aerialDominance", withRecord(outfielder, { hdr_att: 9, hdr_won: 9 }))).toBeNull();
  });

  it("success ratios need 10 attempts", () => {
    const r = withRecord(outfielder, { hdr_att: 3, tck_att: 3, pres_att: 3 });
    expect(value("cbDuelSuccess", r)).toBeNull();
  });

  it("Ações que geraram finalização drops goals from outside the box when they are unknown", () => {
    const r = withRecord(outfielder, {}, { partial_detail: true });
    expect(value("shotActions90", r)).toBeCloseTo(6.12 - (2 * 90) / 900, 5);
  });

  it("keeper ratios need 10 shots faced", () => {
    const r = { ...keeper, keeper: { ...keeper.keeper!, saves: 6, conceded: 3 } };
    expect(value("gkCriticalSaves", r)).toBeNull();
  });

  it("xPG falls back to xGP per 90 without clean sheets", () => {
    const r = { ...keeper, keeper: { ...keeper.keeper!, clean_sheets: 0 } };
    expect(value("gkXpgRatio", r)).toBeCloseTo(0.25, 5);
  });

  it("xGP share is empty when xGP + conceded is not above 0", () => {
    const r = { ...keeper, keeper: { ...keeper.keeper!, xgp100: -1500, conceded: 15 } };
    expect(value("gkXgpShare", r)).toBeNull();
  });

  it("GPI is 0 without non-penalty xG", () => {
    expect(value("gpi", withRecord(outfielder, { npxg100: 0 }))).toBe(0);
  });
});

it("lower is better for possession wasted, defensive errors, coverage and the save gap", () => {
  expect(new Set(ROLE_ITEMS.filter((d) => d.lowerIsBetter).map((d) => d.key))).toEqual(
    new Set(["gkSaveGap", "defErrors90", "possWasted90", "fbDefErrors90", "dmCoverage"]),
  );
});

it("each profile carries the spec's base", () => {
  expect(Object.values(PROFILE_ITEMS).map((k) => k.length)).toEqual([6, 8, 8, 9, 6, 5, 7]);
  expect(ROLE_ITEM_KEYS).toHaveLength(43);
});

it("roleItemColumns gives one column per item, NaN where empty", () => {
  const records = [outfielder, keeper];
  const cols = roleItemColumns(records);
  expect(cols.flair[0]).toBeCloseTo(1.398, 5);
  expect(cols.flair[1]).toBeNaN();
  expect(roleItemColumns(records)).toBe(cols);
});
