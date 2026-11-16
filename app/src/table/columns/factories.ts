import type { PlayerRecord } from "@/data/types";
import { inPool, POOL_HIDDEN_COLUMNS } from "@/engine/columnIds";
import { clampScore, formatSigned } from "@/lib/format";
import { VALUE_MODE } from "@/store/ui";
import { COLUMN_GROUP } from "./ids";
import { missingReason, type Reason, type Sample } from "./missing";
import { textRank } from "./sort";
import type { ChipColumn, ColumnGroup, ExportField, NumberColumn, NumberTier, TextColumn } from "./types";

export interface ColumnCopy {
  id: string;
  abbr: string;
  label: string;
  description: string;
}

const chipWidth = (abbr: string) => Math.max(64, Math.ceil(abbr.length * 6.4) + 30);

export const fromPlayers = (players: readonly PlayerRecord[], get: (r: PlayerRecord) => number | null | undefined) =>
  Float64Array.from(players, (r) => get(r) ?? NaN);

export function signedFormat(decimals: number): (v: number) => string {
  return (v) => formatSigned(v, decimals);
}

function poolShown(id: string, values: ArrayLike<number>, pool: ArrayLike<number> | undefined) {
  if (!POOL_HIDDEN_COLUMNS.has(id)) return { values, hidden: (_: number) => false };
  if (!pool) throw new Error(`column "${id}" is hidden under the pool, but was built without one`);
  return { values: inPool(values, pool), hidden: (i: number) => !pool[i] && !Number.isNaN(values[i]) };
}

export interface ChipSpec {
  id: string;
  abbr: string;
  def: ChipColumn["def"] & { description: string };
  group: ColumnGroup;
  value: ArrayLike<number>;
  pct: ArrayLike<number>;
  samples?: readonly Sample[];
  reason?: Reason;
  scale?: ChipColumn["scale"];
  against?: (i: number) => string;
  width?: number;
  exports?: readonly ExportField[];
}

export function chip(
  {
    id,
    abbr,
    def,
    group,
    value: raw,
    pct: rawPct,
    samples = [],
    reason,
    scale,
    against,
    width,
    exports: extraExports = [],
  }: ChipSpec,
  pool: ArrayLike<number>,
): ChipColumn {
  const shown = poolShown(id, raw, pool);
  const value = shown.values;
  const pct = rawPct === raw ? value : poolShown(id, rawPct, pool).values;
  const shownValue = (i: number) => (def.unit === "score" ? clampScore(value[i]) : value[i]);
  const why = reason ?? ((i: number) => missingReason(i, raw, rawPct, samples, pool));
  return {
    kind: "chip",
    id,
    abbr,
    label: def.label,
    description: def.description,
    group,
    def,
    value,
    pct,
    width: width ?? chipWidth(abbr),
    descFirst: (mode) => mode === VALUE_MODE.percentile || !def.lowerIsBetter,
    missing: (i) => (shown.hidden(i) ? "pool" : why(i)),
    scale,
    against,
    sortKey: (mode) => (mode === VALUE_MODE.percentile ? pct : value),
    exports: [
      {
        header: abbr,
        get: (i, mode) => {
          const v = mode === VALUE_MODE.percentile ? clampScore(Math.round(pct[i])) : shownValue(i);
          return Number.isNaN(v) ? null : v;
        },
      },
      ...extraExports,
    ],
  };
}

export interface NumberSpec extends ColumnCopy {
  width: number;
  value: ArrayLike<number>;
  format(v: number): string;
  descFirst?: boolean;
  tier?: NumberTier;
}

export function number(
  { id, abbr, label, description, width, value: raw, format, descFirst = true, tier }: NumberSpec,
  group: ColumnGroup,
  pool?: ArrayLike<number>,
): NumberColumn {
  const shown = poolShown(id, raw, pool);
  const value = shown.values;
  return {
    kind: "number",
    id,
    abbr,
    label,
    description,
    group,
    width,
    value,
    format,
    tier,
    descFirst: () => descFirst,
    sortKey: () => value,
    exports: [{ header: abbr, get: (i) => (Number.isNaN(value[i]) ? null : value[i]) }],
    emptyReason: (i) => (shown.hidden(i) ? "pool" : undefined),
  };
}

export interface TextSpec extends ColumnCopy {
  width: number;
  n: number;
  text(i: number): string | null;
  sortKey?: ArrayLike<number>;
}

export function text(
  { id, abbr, label, description, width, n, text: get, sortKey }: TextSpec,
  group: ColumnGroup,
): TextColumn {
  const rank = sortKey ? () => sortKey : textRank(n, get);
  return {
    kind: "text",
    id,
    abbr,
    label,
    description,
    group,
    width,
    descFirst: () => false,
    text: get,
    sortKey: rank,
    exports: [{ header: abbr, get: (i) => get(i) }],
  };
}

export function pageNumber(spec: NumberSpec): NumberColumn {
  return { ...number(spec, COLUMN_GROUP.identity), local: true };
}
