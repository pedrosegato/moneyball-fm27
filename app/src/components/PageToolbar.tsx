import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function PageToolbar({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-11 shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-line-subtle px-4 py-1.5",
        className,
      )}
      {...props}
    />
  );
}
