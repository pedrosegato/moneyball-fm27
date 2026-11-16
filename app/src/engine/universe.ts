import type { PlayerRecord } from "@/data/types";
import { heightOf } from "./club";
import { GK, groupsOf, mainGroup, naturalPositions, POS_GROUPS, type PosGroup } from "./positions";
import type { StatDef } from "./stats/catalog";

export type CellValue = number | string | readonly string[] | null | undefined;

export type Columns = Readonly<Record<string, (i: number) => CellValue>>;

export type FilterSpec =
  | { col: string; kind: "range"; min?: number; max?: number }
  | { col: string; kind: "set"; values: readonly string[] }
  | { col: string; kind: "dateRange"; from?: string; to?: string };

const MAIN_GROUPS = new WeakMap<readonly PlayerRecord[], readonly PosGroup[]>();

export function mainGroups(players: readonly PlayerRecord[]): readonly PosGroup[] {
  let groups = MAIN_GROUPS.get(players);
  if (!groups) {
    groups = players.map((r) => mainGroup(r.pos));
    MAIN_GROUPS.set(players, groups);
  }
  return groups;
}

const PLAYABLE = new WeakMap<readonly PlayerRecord[], Uint8Array>();

export function playableGroups(players: readonly PlayerRecord[]): Uint8Array {
  let bits = PLAYABLE.get(players);
  if (!bits) {
    bits = Uint8Array.from(players, (r) => groupsOf(r.pos).reduce((b, g) => b | (1 << POS_GROUPS.indexOf(g)), 0));
    PLAYABLE.set(players, bits);
  }
  return bits;
}

export function keeperFlags(players: readonly PlayerRecord[]): Uint8Array {
  return Uint8Array.from(mainGroups(players), (g) => (g === GK ? 1 : 0));
}

export const IDENTITY_FIELDS = [
  "name",
  "position",
  "nat",
  "nation",
  "club",
  "owner",
  "division",
  "team",
  "foot",
  "dob",
  "contract_end",
  "age",
  "height",
  "value",
  "wage",
  "ca",
  "pa",
] as const satisfies readonly (keyof PlayerRecord)[];

export interface StatColumns {
  defs: readonly Pick<StatDef, "key">[];
  cols: readonly Float64Array[];
}

export function playerColumns(players: readonly PlayerRecord[], stats?: StatColumns): Columns {
  const cols: Record<string, (i: number) => CellValue> = {};
  for (const field of IDENTITY_FIELDS) cols[field] = (i) => players[i][field];
  cols.height = (i) => heightOf(players[i]);
  cols.minutes = (i) => players[i].season?.minutes ?? 0;
  cols.group = (i) => mainGroups(players)[i];
  let groupLists: PosGroup[][] | undefined;
  cols.groups = (i) => {
    groupLists ??= players.map((r) => groupsOf(r.pos));
    return groupLists[i];
  };
  let natural: string[][] | undefined;
  cols.naturalPositions = (i) => {
    natural ??= players.map((r) => naturalPositions(r.pos));
    return natural[i];
  };
  stats?.defs.forEach(({ key }, j) => {
    const values = stats.cols[j];
    cols[key] = (i) => values[i];
  });
  return cols;
}

const hasBound = <T>(b: T | null | undefined): b is T => b != null && !Number.isNaN(b);

function matcher(f: FilterSpec): ((v: CellValue) => boolean) | null {
  switch (f.kind) {
    case "range": {
      const { min, max } = f;
      if (!hasBound(min) && !hasBound(max)) return null;
      const lo = hasBound(min) ? min : -Infinity;
      const hi = hasBound(max) ? max : Infinity;
      return (v) => typeof v === "number" && v >= lo && v <= hi;
    }
    case "set": {
      if (!f.values.length) return null;
      const values = new Set(f.values);
      const has = (v: string | number | null | undefined) => values.has(v == null ? "" : String(v));
      return (v) => (typeof v === "object" && v !== null ? v.some(has) : has(v));
    }
    case "dateRange": {
      const { from, to } = f;
      if (!hasBound(from) && !hasBound(to)) return null;
      return (v) => typeof v === "string" && v !== "" && (!hasBound(from) || v >= from) && (!hasBound(to) || v <= to);
    }
  }
}

export function applyFilters(
  players: readonly PlayerRecord[],
  cols: Columns,
  filters: readonly FilterSpec[],
): Uint8Array {
  const keep = new Uint8Array(players.length).fill(1);
  for (const f of filters) {
    const get = cols[f.col];
    if (!get) throw new Error(`filter on unknown column "${f.col}"`);
    const matches = matcher(f);
    if (!matches) continue;
    for (let i = 0; i < keep.length; i++) if (keep[i] && !matches(get(i))) keep[i] = 0;
  }
  return keep;
}
