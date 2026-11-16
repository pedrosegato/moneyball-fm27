import { stats } from "@/i18n/pt-BR/stats";
import type { SampleSizes } from "./club";
import { type PercentileDef, percentiles } from "./percentiles";
import type { PosGroup } from "./positions";
import type { StatKey } from "./stats/catalog";

export interface Composite {
  id: string;
  label: string;
  kind: "percentileMean" | "weightedSum";
  weights: Record<StatKey, number>;
  group?: PosGroup;
  gkOnly?: boolean;
  outfieldOnly?: boolean;
}

export type ValueColumns = Readonly<Record<StatKey, Float64Array>>;
export type PercentileColumns = Readonly<Record<StatKey, Float32Array>>;

export interface PerformancePool<G extends string = PosGroup> {
  groups: readonly (G | null)[];
  pool: Uint8Array;
}

const MIN_KNOWN_WEIGHT = 0.6;

export const weightedStats = (c: Composite): StatKey[] =>
  Object.entries(c.weights).flatMap(([k, w]) => (w > 0 ? [k] : []));

type ActionsPresetId = keyof typeof stats.preset;

const actionsPreset = (id: ActionsPresetId, preset: Omit<Composite, "id" | "label">): Composite => ({
  id,
  label: stats.preset[id],
  ...preset,
});

export function defaultActionsPresets(): Composite[] {
  return [
    actionsPreset("actions-def", {
      kind: "weightedSum",
      outfieldOnly: true,
      weights: {
        "Clr/90": 1,
        "Int/90": 1,
        "ShBlk/90": 1,
        "PresC/90": 1,
        "TckWon/90": 1,
        "KTck/90": 10,
        "HdrWon/90": 0.8,
        "KHdr/90": 8,
      },
    }),
    actionsPreset("actions-att", {
      kind: "weightedSum",
      outfieldOnly: true,
      weights: { "Ast/90": 1, "CCC/90": 1, "OP-CrC/90": 0.8, "Drb/90": 0.8, "npG/90": 1, "SoT/90": 1 },
    }),
    actionsPreset("actions-cre", {
      kind: "weightedSum",
      outfieldOnly: true,
      weights: { "Ast/90": 1, "CCC/90": 1, "OP-CrC/90": 1, "OP-KP/90": 1 },
    }),
    actionsPreset("actions-gk", {
      kind: "weightedSum",
      gkOnly: true,
      weights: { "Clr/90": 0.1, "Svt/90": 0.4, "Svp/90": 0.4, "Svh/90": 1 },
    }),
    actionsPreset("actions-excitement", {
      kind: "weightedSum",
      outfieldOnly: true,
      weights: { "Shots/90": 1, "Drb/90": 1, "CCC/90": 1, "OP-KP/90": 1, "OP-CrA/90": 1 },
    }),
  ];
}

export const ACTIONS_PRESETS: readonly Composite[] = Object.freeze(
  defaultActionsPresets().map((c) => Object.freeze({ ...c, weights: Object.freeze(c.weights) })),
);

type Column = Float32Array | Float64Array;

interface Inputs {
  n: number;
  terms: { w: number; col: Column }[];
  totalWeight: number;
}

function inputsOf(c: Composite, columns: Readonly<Record<StatKey, Column>>, n: number): Inputs {
  const terms = Object.entries(c.weights)
    .filter(([, w]) => w > 0)
    .map(([key, w]) => {
      const col = columns[key];
      if (!col) throw new Error(`composite ${c.id}: no column for stat "${key}"`);
      if (col.length !== n) throw new Error(`composite ${c.id}: column "${key}" has ${col.length} rows, not ${n}`);
      return { w, col };
    });
  return { n, terms, totalWeight: terms.reduce((sum, t) => sum + t.w, 0) };
}

function rowCount(...tables: Readonly<Record<StatKey, Column>>[]): number {
  for (const table of tables) for (const key in table) return table[key].length;
  return 0;
}

function combine({ n, terms, totalWeight }: Inputs, kind: Composite["kind"]): Float64Array {
  const sum = new Float64Array(n);
  const known = new Float64Array(n);
  for (const { w, col } of terms) {
    for (let i = 0; i < n; i++) {
      const v = col[i];
      if (!Number.isNaN(v)) {
        sum[i] += w * v;
        known[i] += w;
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const enough = totalWeight > 0 && known[i] >= totalWeight * MIN_KNOWN_WEIGHT;
    sum[i] = !enough ? NaN : kind === "percentileMean" ? sum[i] / known[i] : sum[i];
  }
  return sum;
}

export function shrinkSmallSamples(scores: ArrayLike<number>, { minutes, full }: SampleSizes): Float32Array {
  if (minutes.length !== scores.length)
    throw new Error(`shrinkSmallSamples: ${minutes.length} minutes for ${scores.length} scores`);
  return Float32Array.from(scores, (p, i) => 50 + (p - 50) * Math.min(1, minutes[i] / full[i]));
}

export function evalComposite(
  c: Composite,
  cols: ValueColumns,
  pct: PercentileColumns,
  isGk?: Uint8Array,
  sample?: SampleSizes,
): Float32Array {
  const n = rowCount(cols, pct);
  const values = combine(inputsOf(c, c.kind === "weightedSum" ? cols : pct, n), c.kind);
  if (c.gkOnly || c.outfieldOnly) {
    if (!isGk || isGk.length !== n) throw new Error(`composite ${c.id}: needs keeper flags for its ${n} rows`);
    const keepers = c.gkOnly ? 1 : 0;
    for (let i = 0; i < n; i++) if (isGk[i] !== keepers) values[i] = NaN;
  }
  return c.kind === "percentileMean" && sample ? shrinkSmallSamples(values, sample) : Float32Array.from(values);
}

const RAW_SCORE: PercentileDef = {};

export function rankedPercentileMean(c: Composite, pct: PercentileColumns, rankedAmong: Uint8Array): Float32Array {
  const n = rankedAmong.length;
  const raw = combine(inputsOf(c, pct, n), "percentileMean");
  return percentiles([raw], rankedAmong, [RAW_SCORE], new Uint8Array(n), { sides: 1 })[0];
}
