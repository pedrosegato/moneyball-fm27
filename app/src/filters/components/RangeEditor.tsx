import { useMemo } from "react";
import { RangeFilter } from "@/components/RangeFilter";
import { COLUMN } from "@/engine/columnIds";
import { dataBounds } from "@/lib/histogram";
import { poolLabel } from "@/table/columns/labels";
import { type EditorProps, inPounds, rangeValues, shownRate, within } from "../lib/editor";
import { rangeFilter } from "../lib/filterSpecs";
import { filtersText } from "../lib/filtersText";

export function RangeEditor({ target, filter, data, onChange }: EditorProps) {
  const rate = shownRate(target);
  const values = useMemo(() => {
    const pounds = rangeValues(target);
    return rate === 1 ? pounds : pounds.map((v) => v * rate);
  }, [target, rate]);
  const bounds = useMemo(() => dataBounds(values), [values]);
  const { pool, poolMinutes } = data.analysis;
  const pooled = target.col !== COLUMN.minutes;
  const distribution = useMemo(() => (pooled ? within(values, pool) : undefined), [pooled, values, pool]);
  const range = filter?.kind === "range" ? filter : undefined;
  return (
    <RangeFilter
      values={values}
      distribution={distribution}
      distributionLabel={filtersText("editor.distribution", { pool: poolLabel(poolMinutes) })}
      min={range?.min == null ? undefined : range.min * rate}
      max={range?.max == null ? undefined : range.max * rate}
      onChange={(r) => bounds && onChange(inPounds(rangeFilter(target.col, r, bounds), rate))}
    />
  );
}
