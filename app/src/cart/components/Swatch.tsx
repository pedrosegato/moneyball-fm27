import { cn } from "@/lib/utils";

export function Swatch({ className }: { className: string }) {
  return <i aria-hidden className={cn("mr-1.5 inline-block size-2 rounded-[2px] align-middle", className)} />;
}
