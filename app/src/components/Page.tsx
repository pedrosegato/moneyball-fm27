import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Page({ className, ...props }: ComponentProps<"main">) {
  return <main className={cn("flex min-h-0 flex-1 flex-col", className)} {...props} />;
}
