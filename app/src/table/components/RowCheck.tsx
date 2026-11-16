import { SELECT_COLUMN, SELECT_WIDTH } from "../lib/tableModel";
import { tableText } from "../lib/tableText";
import { CheckBox } from "./CheckBox";

export function RowCheck({ checked, name }: { checked: boolean; name: string }) {
  return (
    <td
      data-column-id={SELECT_COLUMN}
      data-row-check
      aria-colindex={1}
      style={{ width: SELECT_WIDTH }}
      className="sticky left-0 z-10 flex h-full flex-none items-center justify-center row-fill"
    >
      <CheckBox check={checked ? "all" : "none"} label={tableText("cell.select", { name })} tabIndex={-1} />
    </td>
  );
}
