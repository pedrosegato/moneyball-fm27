import { RadioGroup } from "@base-ui/react/radio-group";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlProps
  extends Omit<ComponentProps<typeof RadioGroup>, "value" | "defaultValue" | "onValueChange"> {
  value: string;
  onValueChange: (value: string) => void;
}

export const SEGMENTED_TRACK = "inline-flex w-fit items-center rounded-lg border border-line bg-surface-control p-0.5";

export function SegmentedControl({ value, onValueChange, className, ...props }: SegmentedControlProps) {
  return (
    <RadioGroup
      data-slot="segmented-control"
      value={value}
      onValueChange={(next) => onValueChange(next as string)}
      className={cn(SEGMENTED_TRACK, "data-disabled:opacity-50", className)}
      {...props}
    />
  );
}
