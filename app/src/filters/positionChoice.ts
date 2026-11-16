import { GROUP_LABELS } from "@/engine/data/groups";
import { GK, POS_GROUPS, type PosGroup, positionsIn } from "@/engine/positions";
import type { FilterSpec } from "@/engine/universe";
import { POSITION_COLUMN } from "@/table/positionPreset";
import { filtersText } from "./lib/filtersText";

export const POSITION_READING = { all: "todas", outfield: "linha", custom: "personalizada" } as const;

export type PositionChoice = PosGroup | typeof POSITION_READING.outfield;
export type PositionReading = PositionChoice | typeof POSITION_READING.all | typeof POSITION_READING.custom;

const OUTFIELD_GROUPS = POS_GROUPS.filter((g) => g !== GK);
const CHOICES: readonly PositionChoice[] = [POSITION_READING.outfield, ...POS_GROUPS];

export function positionText(reading: PositionReading): string {
  switch (reading) {
    case POSITION_READING.all:
      return filtersText("position.all");
    case POSITION_READING.outfield:
      return filtersText("position.outfield");
    case POSITION_READING.custom:
      return filtersText("position.custom");
    default:
      return GROUP_LABELS[reading];
  }
}

export const positionsOf = (choice: PositionChoice): string[] =>
  positionsIn(choice === POSITION_READING.outfield ? OUTFIELD_GROUPS : [choice]);

export const positionFilter = (choice: PositionChoice): FilterSpec => ({
  col: POSITION_COLUMN,
  kind: "set",
  values: positionsOf(choice),
});

function sameSet(values: ReadonlySet<string>, list: readonly string[]): boolean {
  return values.size === list.length && list.every((v) => values.has(v));
}

export function positionReadingOf(filters: readonly FilterSpec[]): PositionReading {
  const filter = filters.find((f) => f.col === POSITION_COLUMN);
  if (!filter) return POSITION_READING.all;
  if (filter.kind !== "set") return POSITION_READING.custom;
  const values = new Set(filter.values);
  return CHOICES.find((choice) => sameSet(values, positionsOf(choice))) ?? POSITION_READING.custom;
}

export function ownsPositionFilter(filters: readonly FilterSpec[]): boolean {
  const reading = positionReadingOf(filters);
  return reading !== POSITION_READING.all && reading !== POSITION_READING.custom;
}
