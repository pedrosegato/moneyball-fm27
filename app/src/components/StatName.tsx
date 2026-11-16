import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { StatDef } from "@/engine/stats/catalog";
import { cn } from "@/lib/utils";
import { StatTip } from "./StatTip";

interface StatNameProps {
  def: Pick<StatDef, "label" | "description" | "unit">;
  children: ReactNode;
  className?: string;
}

export function StatName({ def, children, className }: StatNameProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={cn("cursor-help", className)} />}>{children}</TooltipTrigger>
      <TooltipContent className="flex-col items-start">
        <StatTip label={def.label} description={def.description} unit={def.unit} />
      </TooltipContent>
    </Tooltip>
  );
}
