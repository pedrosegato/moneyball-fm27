import type { PlayerRecord } from "@/data/types";
import { marketValue, minutesOf, seniorFlags } from "./club";
import { leagueKey } from "./league";

export interface ValueModelOptions {
  minMinutes: number;
  minRows: number;
  poolMinutes: number;
}

export const DEFAULT_VALUE_MODEL_OPTIONS: Readonly<ValueModelOptions> = Object.freeze<ValueModelOptions>({
  minMinutes: 900,
  minRows: 50,
  poolMinutes: 300,
});

const MIN_LEAGUE_VALUES = 10;
const RIDGE = 1e-6;

export interface ValueModel<G extends string> {
  beta: Partial<Record<G, number[]>>;
  rows: Partial<Record<G, number>>;
  leagueLevel: ReadonlyMap<string, number>;
  overallLevel: number;
}

function median(values: readonly number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let m = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
    [A[i], A[m]] = [A[m], A[i]];
    [b[i], b[m]] = [b[m], b[i]];
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const x = Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  return x;
}

export function leastSquares(rows: readonly (readonly [x: readonly number[], y: number])[], ridge = RIDGE): number[] {
  const n = rows[0][0].length;
  const A = Array.from({ length: n }, () => Array<number>(n).fill(0));
  const b = Array<number>(n).fill(0);
  for (const [x, y] of rows) {
    for (let i = 0; i < n; i++) {
      b[i] += x[i] * y;
      for (let j = 0; j < n; j++) A[i][j] += x[i] * x[j];
    }
  }
  for (let i = 1; i < n; i++) A[i][i] += ridge * rows.length;
  return solve(A, b);
}

function features(age: number, perf: number, level: number): number[] {
  const a = (age - 25) / 5;
  return [1, perf / 100, (perf / 100) ** 2, a, a * a, level];
}

const levelOf = (model: Omit<ValueModel<string>, "beta" | "rows">, r: PlayerRecord): number =>
  model.leagueLevel.get(leagueKey(r.division)) ?? model.overallLevel;

export function fitValueModel<G extends string>(
  records: readonly PlayerRecord[],
  perf: ArrayLike<number>,
  groups: readonly (G | null)[],
  { minMinutes, minRows, poolMinutes }: ValueModelOptions = DEFAULT_VALUE_MODEL_OPTIONS,
): ValueModel<G> {
  const senior = seniorFlags(records);
  const byLeague = new Map<string, number[]>();
  const all: number[] = [];
  records.forEach((r, i) => {
    const value = marketValue(r);
    if (!(minutesOf(r) >= poolMinutes && value > 0 && senior[i])) return;
    const key = leagueKey(r.division);
    const lv = Math.log10(value);
    let list = byLeague.get(key);
    if (!list) {
      list = [];
      byLeague.set(key, list);
    }
    list.push(lv);
    all.push(lv);
  });
  const overallLevel = median(all);
  const leagueLevel = new Map(
    [...byLeague].map(([key, lvs]) => [key, lvs.length >= MIN_LEAGUE_VALUES ? median(lvs) : overallLevel] as const),
  );
  const levels = { leagueLevel, overallLevel };

  const byGroup = new Map<G, [x: number[], y: number][]>();
  records.forEach((r, i) => {
    const minutes = minutesOf(r);
    const value = marketValue(r);
    const age = r.age ?? NaN;
    if (minutes < minMinutes || minutes < poolMinutes || !(value > 0) || !senior[i] || Number.isNaN(age)) return;
    const group = groups[i];
    if (group === null || Number.isNaN(perf[i])) return;
    let rows = byGroup.get(group);
    if (!rows) {
      rows = [];
      byGroup.set(group, rows);
    }
    rows.push([features(age, perf[i], levelOf(levels, r)), Math.log10(value)]);
  });

  const beta: Partial<Record<G, number[]>> = {};
  const counts: Partial<Record<G, number>> = {};
  for (const [group, rows] of byGroup) {
    counts[group] = rows.length;
    if (rows.length >= minRows) beta[group] = leastSquares(rows);
  }
  return { beta, rows: counts, ...levels };
}

export function fairValue<G extends string>(
  model: ValueModel<G>,
  player: PlayerRecord,
  group: G | null,
  perf: number,
): number | null {
  const b = group === null ? undefined : model.beta[group];
  const age = player.age ?? NaN;
  if (!b || Number.isNaN(perf) || Number.isNaN(age)) return null;
  return 10 ** features(age, perf, levelOf(model, player)).reduce((s, v, i) => s + v * b[i], 0);
}

export function fairValues<G extends string>(
  model: ValueModel<G>,
  records: readonly PlayerRecord[],
  perf: ArrayLike<number>,
  groups: readonly (G | null)[],
): Float64Array {
  return Float64Array.from(records, (r, i) => fairValue(model, r, groups[i], perf[i]) ?? NaN);
}
