import { COLUMN } from "@/engine/columnIds";
import { type PosGroup, slotGroup } from "@/engine/positions";
import type { FilterSpec } from "@/engine/universe";

export const POSITION_COLUMN = COLUMN.naturalPositions;

export function presetGroupOf(filters: readonly FilterSpec[]): PosGroup | null {
  const filter = filters.find((f) => f.col === POSITION_COLUMN);
  if (filter?.kind !== "set" || !filter.values.length) return null;
  const groups = new Set(filter.values.map(slotGroup));
  const [group] = groups;
  return groups.size === 1 && group ? group : null;
}
