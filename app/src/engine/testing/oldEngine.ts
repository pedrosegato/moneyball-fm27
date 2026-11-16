import fs from "node:fs";
import path from "node:path";
import type { PlayerRecord, Snapshot } from "@/data/types";
import type { PercentileColumns } from "../composites";
import { type LegacyGroup, legacyGroup } from "../positions";

const DEV_DATA = path.resolve(import.meta.dirname, "../../../../.dev-data");
export const OLD_ENGINE_GOLDEN = path.join(DEV_DATA, "golden/old-engine.json");
export const RAW_SNAPSHOT = path.join(DEV_DATA, "snapshots/2026-11-11-raw-competitive.json");

function missingFixtures(suite: string, files: readonly string[]): boolean {
  const missing = files.filter((f) => !fs.existsSync(f));
  if (missing.length) console.warn(`SKIPPED ${suite} on the fixture: missing ${missing.join(", ")}`);
  return missing.length > 0;
}

export const missingOldEngineFixtures = (suite: string): boolean =>
  missingFixtures(suite, [OLD_ENGINE_GOLDEN, RAW_SNAPSHOT]);

export const missingRawSnapshot = (suite: string): boolean => missingFixtures(suite, [RAW_SNAPSHOT]);

export const loadRawSnapshot = (): Snapshot => JSON.parse(fs.readFileSync(RAW_SNAPSHOT, "utf8")) as Snapshot;

type Num = number | null;

export interface GoldenPlayer {
  i: number;
  name: string;
  mins: number;
  ok: boolean;
  grp: LegacyGroup | null;
  pct: Num[];
  perf: Num;
  perfBy: Num[];
  fair: Num;
  ability: { best: Num; vsAge: Num; by: Record<string, Num> };
}

export interface GoldenFitRow {
  uid: string;
  perf: number;
  diff: Num;
  style: Num;
  verdict: "Upgrade" | "Replacement" | "Downgrade" | null;
  ability: Num;
}

export interface OldEngineGolden {
  meta: { date: string; players: number; played: number; pool: { ok: number; small: number } };
  myClub: { uid: string; name: string; league: string | null };
  statKeys: string[];
  groupKeys: LegacyGroup[];
  valueModel: Partial<Record<LegacyGroup, number[]>>;
  players: Record<string, GoldenPlayer>;
  moneyball: {
    count: number;
    rows: {
      uid: string;
      group: LegacyGroup;
      perf: number;
      fair: number;
      value: number;
      ratio: number;
      abilityPct: Num;
    }[];
  };
  tacticalFit: {
    formation: string;
    slots: {
      slot: number;
      pos: string;
      group: LegacyGroup;
      mine: string | null;
      minePerf: Num;
      mineAbility: Num;
      candidates: number;
      top10: GoldenFitRow[];
    }[];
  };
  sellKeep: {
    formation: string;
    counts: Record<string, number>;
    rows: {
      uid: string;
      name: string;
      verdict: string;
      perf: Num;
      fair: Num;
      monthsLeft: Num;
      ability: Num;
      vsAge: Num;
      why: string[];
    }[];
  };
}

export interface OldEngineFixture {
  golden: OldEngineGolden;
  snapshot: Snapshot;

  records: PlayerRecord[];

  legacyValueRecords: PlayerRecord[];
  groups: (LegacyGroup | null)[];

  pool: Uint8Array;

  perf: Float64Array;
  perfBy: Record<LegacyGroup, Float64Array>;
  pct: PercentileColumns;
  clubUid: number;
  indexOf: Map<string, number>;
}

export const nanOf = (v: Num | undefined): number => (v == null ? NaN : v);
export const nullOf = (v: number): number | null => (Number.isNaN(v) ? null : v);

function pythonFixed(x: number, digits: number): string {
  const halves = x * 2 ** (digits + 1);
  if (Number.isInteger(halves) && halves % 2 === 1) {
    const below = Math.floor(x * 10 ** digits);
    return ((below % 2 === 0 ? below : below + 1) / 10 ** digits).toFixed(digits);
  }
  return x.toFixed(digits);
}

export function legacyValue(value: number): number {
  if (value === 0 || value === 300_000_000) return value;
  if (value >= 1e6) return Number.parseFloat(pythonFixed(value / 1e6, 1)) * 1e6;
  if (value >= 1e3) return Number.parseFloat(pythonFixed(value / 1e3, 0)) * 1e3;
  return value;
}

export function loadOldEngine(): OldEngineFixture {
  const golden = JSON.parse(fs.readFileSync(OLD_ENGINE_GOLDEN, "utf8")) as OldEngineGolden;
  const snapshot = loadRawSnapshot();
  const records = snapshot.players;
  const n = records.length;
  if (n !== golden.meta.players) throw new Error(`snapshot has ${n} players, golden ${golden.meta.players}`);

  let lastRow = -1;
  records.forEach((r) => {
    const p = golden.players[String(r.uid)];
    if (!p) return;
    if (p.i <= lastRow) throw new Error(`row order differs from snapshot order at uid ${r.uid}`);
    lastRow = p.i;
  });

  const perf = new Float64Array(n).fill(NaN);
  const perfBy = Object.fromEntries(golden.groupKeys.map((g) => [g, new Float64Array(n).fill(NaN)])) as Record<
    LegacyGroup,
    Float64Array
  >;
  const pctCols = golden.statKeys.map(() => new Float32Array(n).fill(NaN));
  records.forEach((r, i) => {
    const p = golden.players[String(r.uid)];
    if (!p) return;
    perf[i] = nanOf(p.perf);
    golden.groupKeys.forEach((g, k) => {
      perfBy[g][i] = nanOf(p.perfBy[k]);
    });
    p.pct.forEach((v, k) => {
      pctCols[k][i] = nanOf(v);
    });
  });

  return {
    golden,
    snapshot,
    records,
    legacyValueRecords: records.map((r) => ({ ...r, value: legacyValue(r.value) })),
    groups: records.map((r) => legacyGroup(r.position)),
    pool: Uint8Array.from(records, (r) => ((r.season?.minutes ?? 0) >= 300 ? 1 : 0)),
    perf,
    perfBy,
    pct: Object.fromEntries(golden.statKeys.map((k, j) => [k, pctCols[j]])),
    clubUid: Number(golden.myClub.uid),
    indexOf: new Map(records.map((r, i) => [String(r.uid), i])),
  };
}

export const relDiff = (got: number, want: number): number => Math.abs(got - want) / Math.max(Math.abs(want), 1e-300);
