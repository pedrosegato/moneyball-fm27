import type { HeaderCheck } from "../lib/selection";
import { HEADER_SLOT, SELECT_COLUMN, SELECT_WIDTH } from "../lib/tableModel";
import { tableText } from "../lib/tableText";
import { CheckBox } from "./CheckBox";

interface SelectHeaderProps {
  check: HeaderCheck;
  tabbable: boolean;
  empty: boolean;
  onToggleAll(): void;
}

export function SelectHeader({ check, tabbable, empty, onToggleAll }: SelectHeaderProps) {
  return (
    <th
      scope="col"
      data-column-id={SELECT_COLUMN}
      aria-colindex={1}
      style={{ width: SELECT_WIDTH }}
      className="sticky left-0 z-10 flex h-full flex-none items-end justify-center bg-surface-canvas pb-2.5 shadow-[inset_0_-1px_0_var(--line)]"
    >
      <CheckBox
        check={check}
        label={tableText("cell.selectAll")}
        slot={HEADER_SLOT.select}
        tabIndex={tabbable ? 0 : -1}
        disabled={empty}
        onToggle={onToggleAll}
      />
    </th>
  );
}
