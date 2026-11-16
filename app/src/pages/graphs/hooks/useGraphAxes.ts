import { useMemo } from "react";
import type { FilterSpec } from "@/engine/universe";
import type { GraphAxesKey } from "@/store/ui";
import type { ChipColumn, TableColumn } from "@/table/columns/types";
import { presetGroupOf } from "@/table/positionPreset";
import { ANY_POSITION, type Axis, type AxisPair, axesFor, axisFrom } from "../lib/scatter";

export interface PlotAxes {
  x: Axis;
  y: Axis;
  xColumn: ChipColumn;
  yColumn: ChipColumn;
}

const isChip = (c: TableColumn): c is ChipColumn => c.kind === "chip";

function useAxes(byId: ReadonlyMap<string, ChipColumn>, pair: AxisPair): PlotAxes | null {
  const xColumn = byId.get(pair.x);
  const yColumn = byId.get(pair.y);
  const x = useMemo(() => (xColumn ? axisFrom(xColumn) : null), [xColumn]);
  const y = useMemo(() => (yColumn ? axisFrom(yColumn) : null), [yColumn]);
  return useMemo(() => (x && y && xColumn && yColumn ? { x, y, xColumn, yColumn } : null), [x, y, xColumn, yColumn]);
}

export function useGraphAxes(
  columns: readonly TableColumn[] | null,
  filters: readonly FilterSpec[],
  saved: Partial<Record<GraphAxesKey, AxisPair>>,
) {
  const options = useMemo(() => (columns ?? []).filter(isChip), [columns]);
  const byId = useMemo(() => new Map(options.map((c) => [c.id, c])), [options]);
  const available = useMemo(() => new Set(byId.keys()), [byId]);
  const axesKey: GraphAxesKey = useMemo(() => presetGroupOf(filters) ?? ANY_POSITION, [filters]);
  const pair = axesFor(axesKey, saved[axesKey], available);
  const axes = useAxes(byId, pair);
  return { options, axesKey, pair, axes };
}
