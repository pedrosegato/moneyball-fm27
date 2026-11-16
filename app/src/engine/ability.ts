import type { PlayerRecord } from "@/data/types";
import type { PerformancePool } from "./composites";
import { ABILITY_POSITIONS, ABILITY_WEIGHTS, AGE_BENCHMARKS, type Archetype } from "./data/abilityWeights";
import { ATTRIBUTE_NAMES } from "./data/attributes";
import { type PercentileDef, percentiles } from "./percentiles";
import { positionSet } from "./positions";

const ATTRIBUTE_INDEX = new Map<string, number>(ATTRIBUTE_NAMES.map((a, i) => [a, i]));

function attributeIndex(name: string): number {
  const index = ATTRIBUTE_INDEX.get(name);
  if (index === undefined) throw new Error(`ability weights name an unknown attribute: ${name}`);
  return index;
}

const WEIGHTS = Object.fromEntries(
  Object.entries(ABILITY_WEIGHTS).map(([k, w]) => [k, Object.entries(w).map(([a, x]) => [attributeIndex(a), x])]),
) as Record<Archetype, [index: number, weight: number][]>;

type Attributes = readonly number[] | null | undefined;

export const hasAttributes = (attrs: Attributes): attrs is readonly number[] =>
  Array.isArray(attrs) && attrs.length === ATTRIBUTE_NAMES.length;

export function archetypeScore(attrs: Attributes, archetype: Archetype): number {
  if (!hasAttributes(attrs)) return NaN;
  let total = 0;
  let weight = 0;
  for (const [i, w] of WEIGHTS[archetype]) {
    total += (attrs[i] / 5) * w;
    weight += w;
  }
  return total / weight;
}

export function abilities(attrs: Attributes, position: string): Partial<Record<Archetype, number>> {
  const scores: Partial<Record<Archetype, number>> = {};
  for (const slot of positionSet(position)) {
    for (const k of ABILITY_POSITIONS[slot] ?? []) if (!(k in scores)) scores[k] = archetypeScore(attrs, k);
  }
  return scores;
}

export function bestAbility(attrs: Attributes, position: string): { score: number; archetype: Archetype | null } {
  let best: { score: number; archetype: Archetype | null } = { score: NaN, archetype: null };
  for (const [k, score] of Object.entries(abilities(attrs, position)) as [Archetype, number][]) {
    if (!Number.isNaN(score) && !(score <= best.score)) best = { score, archetype: k };
  }
  return best;
}

export function abilityAt(attrs: Attributes, slot: string): number {
  const scores = (ABILITY_POSITIONS[slot] ?? []).map((k) => archetypeScore(attrs, k)).filter((x) => !Number.isNaN(x));
  return scores.length ? Math.max(...scores) : NaN;
}

const MIN_BENCHMARK_AGE = 15;
const MAX_BENCHMARK_AGE = 24;

export function vsAge(score: number, age: number | null): number {
  if (Number.isNaN(score) || age === null || !(age > 0)) return NaN;
  const benchmark = AGE_BENCHMARKS[Math.min(MAX_BENCHMARK_AGE, Math.max(MIN_BENCHMARK_AGE, age))];
  return Math.round((score / benchmark) * 100);
}

export function abilityColumns(records: readonly PlayerRecord[]): { best: Float64Array; vsAge: Float64Array } {
  const best = Float64Array.from(records, (r) => bestAbility(r.attrs, r.position).score);
  return { best, vsAge: Float64Array.from(records, (r, i) => vsAge(best[i], r.age)) };
}

const RAW_SCORE: PercentileDef = {};

export function abilityPercentiles<G extends string>(
  best: ArrayLike<number>,
  { groups, pool }: PerformancePool<G>,
): Float32Array {
  const n = groups.length;
  if (best.length !== n || pool.length !== n)
    throw new Error("abilityPercentiles: best, groups and pool differ in length");
  const scores = Float64Array.from(best);
  const oneSide = new Uint8Array(n);
  const out = new Float32Array(n).fill(NaN);
  for (const group of new Set(groups)) {
    if (group === null) continue;
    const among = Uint8Array.from(groups, (g, i) => (pool[i] && g === group ? 1 : 0));
    const ranked = percentiles([scores], among, [RAW_SCORE], oneSide, { sides: 1 })[0];
    for (let i = 0; i < n; i++) if (groups[i] === group) out[i] = ranked[i];
  }
  return out;
}
