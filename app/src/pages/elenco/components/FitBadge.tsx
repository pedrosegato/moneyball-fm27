import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FitBadgeProps {
  fit: "good" | "poor";
  className?: string;
}

export function FitBadge({ fit, className }: FitBadgeProps) {
  const Icon = fit === "good" ? Check : X;
  return (
    <span
      aria-hidden
      data-fit-badge={fit}
      className={cn(
        "grid size-4 place-items-center rounded-full text-surface-raised",
        fit === "good" ? "bg-success" : "bg-destructive",
        className,
      )}
    >
      <Icon className="size-3" strokeWidth={3} />
    </span>
  );
}
