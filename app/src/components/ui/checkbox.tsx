import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "cn";
import { CheckIcon, MinusIcon } from "lucide-react";

const CHECKBOX_CLASS =
  "peer group/checkbox relative grid size-4 shrink-0 place-items-center rounded-sm border-[1.5px] border-line-strong transition-[background-color,border-color,box-shadow,scale] duration-(--duration-press) ease-out outline-none after:absolute after:-inset-x-3 after:-inset-y-2 hover:border-fg-faint focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-(--motion-press-scale) data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/25 group-has-disabled/field:opacity-50 data-checked:border-signal data-checked:bg-signal data-checked:text-ink-1 data-checked:hover:brightness-110 data-indeterminate:border-signal data-indeterminate:bg-signal data-indeterminate:text-ink-1 data-indeterminate:hover:brightness-110";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root data-slot="checkbox" className={cn(CHECKBOX_CLASS, className)} {...props}>
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current [&>svg]:size-3"
      >
        <CheckIcon strokeWidth={3} className="group-data-indeterminate/checkbox:hidden" />
        <MinusIcon strokeWidth={3} className="hidden group-data-indeterminate/checkbox:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { CHECKBOX_CLASS, Checkbox };
