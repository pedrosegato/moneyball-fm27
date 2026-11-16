import { useMemo } from "react";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { dateBounds } from "@/lib/dates";
import { contractDates, type EditorProps } from "../lib/editor";
import { dateRangeFilter } from "../lib/filterSpecs";

export function DateEditor({ target, filter, data, onChange }: EditorProps) {
  const values = contractDates(data.players);
  const bounds = useMemo(() => dateBounds(values), [values]);
  const range = filter?.kind === "dateRange" ? filter : undefined;
  return (
    <DateRangeFilter
      label={target.column.label}
      values={values}
      min={range?.from}
      max={range?.to}
      reference={data.gameDate}
      onChange={(r) => bounds && onChange(dateRangeFilter(target.col, r, bounds))}
    />
  );
}
