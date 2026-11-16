import type { ReactNode } from "react";
import { slotName } from "../lib/slots";

export interface SlotItem {
  slot: number;
  text: string;
}

const ITEM = "rounded-xs text-fg-secondary tabular-nums underline-offset-2 focus-ring hover:text-fg hover:underline";

interface NeedsItemsProps {
  label: string;
  icon?: ReactNode;
  items: readonly SlotItem[];
  slots: readonly string[];
  onSelect(slot: number): void;
}

export function NeedsItems({ label, icon, items, slots, onSelect }: NeedsItemsProps) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
      <span className="flex items-center gap-x-1.5">
        {icon}
        <span className="font-[600] text-fg-muted">{label}</span>
      </span>
      {items.map(({ slot, text }) => (
        <button key={slot} type="button" title={slotName(slots[slot])} className={ITEM} onClick={() => onSelect(slot)}>
          {text}
        </button>
      ))}
    </p>
  );
}
