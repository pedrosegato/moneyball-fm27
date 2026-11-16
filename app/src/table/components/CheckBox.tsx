import { CheckIcon, MinusIcon } from "lucide-react";
import { type KeyboardEvent, useLayoutEffect, useRef } from "react";
import { CHECKBOX_CLASS } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { HeaderCheck } from "../lib/selection";

interface CheckBoxProps {
  check: HeaderCheck;
  label: string;
  slot?: string;
  tabIndex?: number;
  disabled?: boolean;
  onToggle?(): void;
}

export function CheckBox({ check, label, slot, tabIndex, disabled, onToggle }: CheckBoxProps) {
  const input = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (input.current) input.current.indeterminate = check === "some";
  }, [check]);
  const onKeyDown = (e: KeyboardEvent) => {
    if (!onToggle || (e.key !== " " && e.key !== "Enter")) return;
    e.preventDefault();
    onToggle();
  };
  return (
    <span
      data-disabled={disabled || undefined}
      data-checked={check === "all" || undefined}
      data-indeterminate={check === "some" || undefined}
      className={cn(CHECKBOX_CLASS, "has-focus-visible:ring-3 has-focus-visible:ring-ring/50")}
    >
      <input
        ref={input}
        type="checkbox"
        checked={check === "all"}
        aria-label={label}
        aria-disabled={disabled || undefined}
        data-header-slot={slot}
        tabIndex={tabIndex}
        readOnly={!onToggle}
        onChange={onToggle}
        onKeyDown={onKeyDown}
        className="absolute -inset-x-2.5 -inset-y-2 z-10 cursor-[inherit] appearance-none opacity-0"
      />
      {check === "all" && <CheckIcon aria-hidden strokeWidth={3} className="size-3" />}
      {check === "some" && <MinusIcon aria-hidden strokeWidth={3} className="size-3" />}
    </span>
  );
}
