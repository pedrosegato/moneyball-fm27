import type { EditorProps } from "../lib/editor";
import { DateEditor } from "./DateEditor";
import { ListEditor } from "./ListEditor";
import { RangeEditor } from "./RangeEditor";

export function ColumnFilterEditor(props: EditorProps) {
  switch (props.target.kind) {
    case "range":
      return <RangeEditor {...props} />;
    case "set":
      return <ListEditor {...props} />;
    case "dateRange":
      return <DateEditor {...props} />;
  }
}
