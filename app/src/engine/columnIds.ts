import { isIsoDate } from "@/lib/dates";
import { isFiniteNumber, isRecord } from "@/lib/guards";
import { STAT_KEYS } from "./stats/catalog";
import { type FilterSpec, IDENTITY_FIELDS } from "./universe";

export const PERCENTILE_PREFIX = "pct:";
export const percentileColumn = (key: string): string => `${PERCENTILE_PREFIX}${key}`;

export const COLUMN = {
  minutes: "minutes",
  group: "group",
  groups: "groups",
  naturalPositions: "naturalPositions",
  ability: "ability",
  vsAge: "vsAge",
  rating: "rating",
  marketValue: "marketValue",
  monthsLeft: "monthsLeft",
  leagueStrength: "leagueStrength",
  perf: "perf",
  fair: "fair",
  abilityPct: "abilityPct",
  valueRatio: "valueRatio",
  statsVsAbility: "statsVsAbility",
} as const;
export type ColumnId = (typeof COLUMN)[keyof typeof COLUMN];

const PLAYER_COLUMNS = [COLUMN.minutes, COLUMN.group, COLUMN.groups, COLUMN.naturalPositions] as const;
export const SNAPSHOT_NUMBER_COLUMNS = [
  COLUMN.ability,
  COLUMN.vsAge,
  COLUMN.rating,
  COLUMN.marketValue,
  COLUMN.monthsLeft,
  COLUMN.leagueStrength,
] as const;
export const RATING_PERCENTILE = percentileColumn(COLUMN.rating);
export const SCORE_COLUMNS = [
  COLUMN.perf,
  COLUMN.fair,
  COLUMN.abilityPct,
  COLUMN.valueRatio,
  COLUMN.statsVsAbility,
] as const;

const POOL_HIDDEN_SCORES = [
  COLUMN.perf,
  COLUMN.fair,
  COLUMN.valueRatio,
  COLUMN.statsVsAbility,
] as const satisfies readonly (typeof SCORE_COLUMNS)[number][];

export const POOL_HIDDEN_COLUMNS: ReadonlySet<string> = new Set<string>(POOL_HIDDEN_SCORES);

export function inPool(values: ArrayLike<number>, pool: ArrayLike<number>): Float64Array {
  return Float64Array.from({ length: values.length }, (_, i) => (pool[i] ? values[i] : NaN));
}

let snapshotIds: ReadonlySet<string> | null = null;

export function snapshotColumnIds(): ReadonlySet<string> {
  snapshotIds ??= new Set<string>([...IDENTITY_FIELDS, ...PLAYER_COLUMNS, ...STAT_KEYS, ...SNAPSHOT_NUMBER_COLUMNS]);
  return snapshotIds;
}

export function analysisColumnIds(compositeIds: readonly string[]): ReadonlySet<string> {
  const ids = new Set(snapshotColumnIds());
  for (const key of STAT_KEYS) ids.add(percentileColumn(key));
  ids.add(RATING_PERCENTILE);
  for (const id of compositeIds) ids.add(id).add(percentileColumn(id));
  for (const id of SCORE_COLUMNS) ids.add(id);
  return ids;
}

function boundsOf(value: Record<string, unknown>, keys: readonly string[], valid: (v: unknown) => boolean) {
  const bounds: Record<string, unknown> = {};
  for (const key of keys) {
    const v = value[key];
    if (v === undefined || v === null) continue;
    if (!valid(v)) return null;
    bounds[key] = v;
  }
  return bounds;
}

export function knownFilter(value: unknown, columns: ReadonlySet<string>): FilterSpec | null {
  if (!isRecord(value) || typeof value.col !== "string" || !columns.has(value.col)) return null;
  const { col } = value;
  switch (value.kind) {
    case "range": {
      const bounds = boundsOf(value, ["min", "max"], isFiniteNumber);
      return bounds && { col, kind: "range", ...bounds };
    }
    case "dateRange": {
      const bounds = boundsOf(value, ["from", "to"], isIsoDate);
      return bounds && { col, kind: "dateRange", ...bounds };
    }
    case "set": {
      const { values } = value;
      if (!Array.isArray(values) || !values.every((v) => typeof v === "string")) return null;
      return { col, kind: "set", values: [...values] };
    }
    default:
      return null;
  }
}
