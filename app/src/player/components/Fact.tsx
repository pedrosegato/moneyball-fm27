import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const FACT_SPAN = "col-span-3 @[19rem]:col-span-2";

interface FactProps {
  label: string;
  title?: string;
  value: ReactNode;
  className?: string;
}

export function Fact({ label, title, value, className = FACT_SPAN }: FactProps) {
  return (
    <li className={cn("flex min-w-0 flex-col gap-0.5 bg-surface-raised px-2 py-1.5", className)} title={title}>
      <span className="type-caption text-fg-muted">{label}</span>
      {typeof value === "string" ? <span className="truncate font-[560] tabular-nums text-fg">{value}</span> : value}
    </li>
  );
}
