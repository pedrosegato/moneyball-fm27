import { beforeAll, describe, expect, it } from "vitest";
import type { PlayerRecord } from "@/data/types";
import { monthsLeft } from "./club";
import { ATTRIBUTE_NAMES } from "./data/attributes";
import { fairValues, fitValueModel } from "./fairValue";
import { type LegacyGroup, legacyGroup, legacySlotGroup, positionSet } from "./positions";
import {
  contractedSquad,
  DEFAULT_SELL_KEEP_OPTIONS,
  SELL_KEEP_VERDICTS,
  type SellKeepContext,
  type SellKeepReason,
  type SellKeepVerdict,
  sellKeep,
} from "./sellKeep";
import { pickLineup } from "./tacticalFit";
import { loadOldEngine, missingOldEngineFixtures, nullOf, type OldEngineFixture, relDiff } from "./testing/oldEngine";
import { playerRecord, type RecordParts } from "./testing/records";

const MY = 77;
const DATE = "2026-10-30";
const attrs = (v: number) => ATTRIBUTE_NAMES.map(() => v);

interface SquadPlayer {
  parts?: RecordParts;
  perf?: number;
  fair?: number;
}

function squadCase(players: SquadPlayer[], xi: (number | null)[], slots = ["GK", "ST(C)"]) {
  const records: PlayerRecord[] = players.map((p) =>
    playerRecord({ club_uid: MY, club: "Nós", value: 1_000_000, position: "ST (C)", minutes: 2000, ...p.parts }),
  );
  const groups = records.map((r) => legacyGroup(r.position));
  const perf = Float64Array.from(players, (p) => p.perf ?? NaN);
  const ctx: SellKeepContext<LegacyGroup> = {
    records,
    groups,
    positions: records.map((r) => positionSet(r.position)),
    perf,
    perfIn: { GK: perf, ST: perf },
    fair: Float64Array.from(players, (p) => p.fair ?? 1_000_000),
    lineup: { slots, xi },
    slotGroup: legacySlotGroup,
    clubUid: MY,
    date: DATE,
  };
  const run = (opts = DEFAULT_SELL_KEEP_OPTIONS) => {
    const out = sellKeep(contractedSquad(records, MY), ctx, opts);
    return records.map((r) => out.get(r.uid));
  };
  return { records, run };
}

const SQUAD: SquadPlayer[] = [
  { perf: 80 },
  { perf: 70 },
  { perf: 60 },
  { perf: 50, parts: { age: 30 } },
  { perf: 50, parts: { position: "GK", age: 34, contract_end: "2027-04-30" } },
  { perf: 40, parts: { position: "GK", age: 33 } },
  { parts: { minutes: 100, age: 19, attrs: attrs(65) } },
  { parts: { minutes: 0, age: 20, attrs: attrs(55) } },
  { parts: { minutes: 0, age: 21, attrs: attrs(50) } },
  { parts: { minutes: 100, age: 24, attrs: attrs(50) } },
  { parts: { age: 30 } },
  { perf: 65, parts: { value: 3_000_000 } },
  { perf: 55, parts: { contract_end: "2026-10-15" } },
  { perf: 30, parts: { club_uid: 5, owner: "Nós", owner_uid: MY, age: 30, value: 400_000 } },
];

describe("contractedSquad", () => {
  it("is the club's contracted players in record order, loanees in left out and loaned-out players kept", () => {
    const records = [
      playerRecord({ club_uid: MY }),
      playerRecord({ club_uid: MY, owner: "Dono", owner_uid: 5 }),
      playerRecord({ club_uid: 5, owner: "Nós", owner_uid: MY }),
      playerRecord({ club_uid: 5 }),
    ];
    expect(contractedSquad(records, MY)).toEqual([0, 2]);
  });
});

describe("sellKeep", () => {
  it("defaults to the old thresholds", () => {
    expect(DEFAULT_SELL_KEEP_OPTIONS).toEqual({
      devVsAge: 100,
      loanVsAge: 85,
      contractMonths: 12,
      sellHighRatio: 2,
      declineAge: 29,
      gkDeclineAge: 33,
      youngAge: 23,
      poolMinutes: 300,
    });
    expect(SELL_KEEP_VERDICTS).toEqual([
      "keep",
      "renew",
      "sellHigh",
      "sellNow",
      "surplus",
      "sellBeforeDecline",
      "develop",
      "loanOut",
      "release",
      "notEnoughData",
    ]);
  });

  it("runs the old cascade", () => {
    const { run } = squadCase(SQUAD, [4, 0]);
    expect(run().map((v) => v?.verdict)).toEqual<SellKeepVerdict[]>([
      "keep",
      "keep",
      "surplus",
      "surplus",
      "renew",
      "sellBeforeDecline",
      "develop",
      "loanOut",
      "release",
      "notEnoughData",
      "notEnoughData",
      "sellHigh",
      "sellNow",
      "surplus",
    ]);
  });

  it("gives the reasons in the old order", () => {
    const { run } = squadCase(SQUAD, [4, 0]);
    expect(run().map((v) => v?.reasons)).toEqual<SellKeepReason[][]>([
      [{ kind: "starter", pos: "ST(C)" }],
      [{ kind: "backup", pos: "ST(C)" }],
      [{ kind: "noRole" }],
      [{ kind: "noRole" }, { kind: "pastPeak", age: 30 }],
      [
        { kind: "starter", pos: "GK" },
        { kind: "contract", months: 6 },
        { kind: "pastPeak", age: 34 },
      ],
      [
        { kind: "backup", pos: "GK" },
        { kind: "pastPeak", age: 33 },
      ],
      [{ kind: "judgedOnAttributes", age: 19, minutes: 100, vsAge: 103, ability: 13 }],
      [{ kind: "judgedOnAttributes", age: 20, minutes: 0, vsAge: 85, ability: 11 }],
      [{ kind: "judgedOnAttributes", age: 21, minutes: 0, vsAge: 76, ability: 10 }],
      [{ kind: "tooFewMinutes", minMinutes: 300, ability: 10 }],
      [
        { kind: "tooFewMinutes", minMinutes: 300, ability: null },
        { kind: "pastPeak", age: 30 },
      ],
      [{ kind: "noRole" }, { kind: "overvalued", ratio: 3 }],
      [{ kind: "noRole" }, { kind: "contract", months: -1 }],
      [{ kind: "noRole" }, { kind: "undervalued", ratio: 0.4 }, { kind: "pastPeak", age: 30 }, { kind: "loanedOut" }],
    ]);
  });

  it("an overvalued starter is sold high only from a year before the decline age", () => {
    const at = (age: number) => {
      const players = [{ perf: 80, parts: { age, value: 3_000_000 } }];
      return squadCase(players, [null, 0]).run()[0]?.verdict;
    };
    expect(at(27)).toBe("keep");
    expect(at(28)).toBe("sellHigh");
  });

  it("every threshold is a setting", () => {
    const { run } = squadCase(SQUAD, [4, 0]);
    const v = run({ ...DEFAULT_SELL_KEEP_OPTIONS, contractMonths: 3, devVsAge: 104, gkDeclineAge: 35 });
    expect(v.map((x) => x?.verdict).slice(4, 8)).toEqual(["keep", "keep", "loanOut", "loanOut"]);
    expect(run({ ...DEFAULT_SELL_KEEP_OPTIONS, youngAge: 18 })[6]?.verdict).toBe("notEnoughData");
    expect(run({ ...DEFAULT_SELL_KEEP_OPTIONS, sellHighRatio: 4 })[11]?.verdict).toBe("surplus");
  });
});

const OLD_LABEL: Record<SellKeepVerdict, string> = {
  keep: "Keep",
  renew: "Renew",
  sellHigh: "Sell high",
  sellNow: "Sell now",
  surplus: "Surplus",
  sellBeforeDecline: "Sell before decline",
  develop: "Develop",
  loanOut: "Loan out",
  release: "Release",
  notEnoughData: "Not enough data",
};

const posLbl = (k: string) => (k === "ST(C)" ? "ST" : k.replace(/[()]/g, ""));
const f0 = (v: number) => (Number.isNaN(v) ? "–" : String(Math.round(v)));
const f1 = (v: number) => (Number.isNaN(v) ? "–" : v.toFixed(1));
function oldWhy(r: SellKeepReason): string {
  switch (r.kind) {
    case "starter":
      return `Starter at ${posLbl(r.pos)}`;
    case "backup":
      return `Backup at ${posLbl(r.pos)}`;
    case "noRole":
      return "Not a starter or first backup anywhere in your formation";
    case "contract":
      return r.months <= 0 ? "Contract has ended" : `Contract ends in ${r.months} month${r.months === 1 ? "" : "s"}`;
    case "overvalued":
      return `Valued at ${r.ratio.toFixed(1)}× the fair value of their output`;
    case "undervalued":
      return `Valued at ${Math.round(r.ratio * 100)}% of the fair value of their output`;
    case "pastPeak":
      return `Age ${r.age}: value usually falls from here`;
    case "loanedOut":
      return "Out on loan";
    case "judgedOnAttributes":
      return `Age ${r.age} with ${f0(r.minutes)} minutes, judged on attributes: vs Age ${r.vsAge}% (ability ${f1(r.ability)})`;
    case "tooFewMinutes":
      return `Under ${r.minMinutes} minutes, so no verdict${r.ability === null ? "" : ` (ability ${f1(r.ability)})`}`;
  }
}

describe.skipIf(missingOldEngineFixtures("sell/keep"))("sell/keep on the fixture", () => {
  let fx: OldEngineFixture;
  beforeAll(() => {
    fx = loadOldEngine();
  }, 120_000);

  it("sellKeep verdicts equal", () => {
    const records = fx.legacyValueRecords;
    const golden = fx.golden.sellKeep;
    const positions = records.map((r) => positionSet(r.position));
    const model = fitValueModel(records, fx.perf, fx.groups);
    const fair = fairValues(model, records, fx.perf, fx.groups);
    const lineup = pickLineup(records, positions, fx.clubUid, golden.formation);
    const date = fx.snapshot.date;
    expect(date).toBe(fx.golden.meta.date);
    const ctx: SellKeepContext<LegacyGroup> = {
      records,
      groups: fx.groups,
      positions,
      perf: fx.perf,
      perfIn: fx.perfBy,
      fair,
      lineup,
      slotGroup: legacySlotGroup,
      clubUid: fx.clubUid,
      date,
    };
    const start = performance.now();
    const verdicts = sellKeep(contractedSquad(records, fx.clubUid), ctx);
    console.info(`sellKeep on ${verdicts.size} squad players: ${(performance.now() - start).toFixed(1)} ms`);

    expect(golden.rows.length).toBeGreaterThan(30);

    expect([...verdicts.keys()].map(String).sort()).toEqual(golden.rows.map((r) => r.uid).sort());
    const counts: Record<string, number> = {};
    for (const row of golden.rows) {
      const i = fx.indexOf.get(row.uid)!;
      const v = verdicts.get(records[i].uid)!;
      counts[OLD_LABEL[v.verdict]] = (counts[OLD_LABEL[v.verdict]] ?? 0) + 1;
      expect([row.uid, OLD_LABEL[v.verdict], v.reasons.map(oldWhy)]).toEqual([row.uid, row.verdict, row.why]);
      expect([row.uid, nullOf(monthsLeft(records[i], date))]).toEqual([row.uid, row.monthsLeft]);
      if (row.fair !== null) expect([row.uid, relDiff(fair[i], row.fair) < 1e-3]).toEqual([row.uid, true]);
    }
    expect(counts).toEqual(golden.counts);
  });
});
