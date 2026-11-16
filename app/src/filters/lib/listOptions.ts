import type { ListOption } from "@/components/ListFilter";
import type { PlayerRecord } from "@/data/types";
import { COLUMN } from "@/engine/columnIds";
import { naturalPositions, POS_NAMES } from "@/engine/positions";
import { compareNatural } from "@/lib/text";
import { optionLabel } from "./filterLabels";
import type { ListColumn } from "./targets";

function valuesOf(r: PlayerRecord, col: string): readonly string[] {
  if (col === COLUMN.naturalPositions) return naturalPositions(r.pos);
  const v = r[col as Exclude<ListColumn, typeof COLUMN.naturalPositions>];
  return [v == null ? "" : String(v)];
}

const OPTIONS = new WeakMap<readonly PlayerRecord[], Map<string, ListOption[]>>();

const positionOrder = (v: string) => (POS_NAMES as readonly string[]).indexOf(v);

export function listOptions(players: readonly PlayerRecord[], col: string): ListOption[] {
  let byCol = OPTIONS.get(players);
  if (!byCol) {
    byCol = new Map();
    OPTIONS.set(players, byCol);
  }
  const cached = byCol.get(col);
  if (cached) return cached;
  const counts = new Map<string, number>();
  for (const r of players) for (const v of valuesOf(r, col)) counts.set(v, (counts.get(v) ?? 0) + 1);
  const options = [...counts].map(([value, count]) => ({ value, label: optionLabel(col, value), count }));
  if (col === COLUMN.naturalPositions) options.sort((a, b) => positionOrder(a.value) - positionOrder(b.value));
  else options.sort((a, b) => b.count - a.count || compareNatural(a.label, b.label));
  byCol.set(col, options);
  return options;
}
