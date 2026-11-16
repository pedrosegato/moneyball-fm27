import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Note({ icon = false, children }: { icon?: boolean; children: ReactNode }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 type-caption text-fg-muted",
        icon && "rounded-lg border border-line bg-surface-raised px-2.5 py-2 text-fg-secondary",
      )}
    >
      {icon && <Info className="mt-px size-3.5 shrink-0 text-fg-muted" aria-hidden />}
      <span>{children}</span>
    </p>
  );
}
