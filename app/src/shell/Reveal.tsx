import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Reveal({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      inert={!open}
      aria-hidden={!open || undefined}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-(--duration-panel) ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="flex min-h-0 flex-col gap-0.5 overflow-hidden">{children}</div>
    </div>
  );
}
