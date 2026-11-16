import { useMemo } from "react";
import { ListFilter } from "@/components/ListFilter";
import type { EditorProps } from "../lib/editor";
import { listOptions } from "../lib/listOptions";

export function ListEditor({ target, filter, data, onChange }: EditorProps) {
  const options = useMemo(() => listOptions(data.players, target.col), [data.players, target.col]);
  const selected = filter?.kind === "set" ? filter.values : [];
  return (
    <ListFilter
      label={target.column.label}
      options={options}
      selected={selected}
      onChange={(values) => onChange(values.length ? { col: target.col, kind: "set", values } : null)}
    />
  );
}
