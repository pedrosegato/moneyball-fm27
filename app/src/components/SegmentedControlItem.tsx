import { Radio } from "@base-ui/react/radio";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const SEGMENTED_ITEM =
  "inline-flex h-[1.375rem] cursor-default items-center justify-center gap-1.5 rounded-md px-2.5 type-label whitespace-nowrap text-fg-muted transition-[color,background-color,box-shadow,scale] duration-(--duration-press) ease-out focus-ring select-none hover:text-fg active:scale-(--motion-press-scale) active:bg-surface-hover [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0";

export function SegmentedControlItem({ className, ...props }: ComponentProps<typeof Radio.Root>) {
  return (
    <Radio.Root
      data-slot="segmented-control-item"
      className={cn(
        SEGMENTED_ITEM,
        "data-checked:bg-surface-active data-checked:text-fg data-checked:shadow-sm data-disabled:pointer-events-none",
        className,
      )}
      {...props}
    />
  );
}
