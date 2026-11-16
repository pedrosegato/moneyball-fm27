import { StatTip } from "@/components/StatTip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EMPTY_VALUE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { HEAD_TO_HEAD_GRID, referenceTip, spokenLine } from "../lib/headToHead";
import type { StatLine } from "../lib/profile";
import { statText } from "../lib/statText";
import { HeadToHeadBar } from "./HeadToHeadBar";

export function HeadToHeadRow({ line }: { line: StatLine }) {
  const { def, pct } = line;
  const tip = referenceTip(line);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <li
            aria-label={spokenLine(line)}
            className={cn(HEAD_TO_HEAD_GRID, "h-[1.625rem] rounded-sm hover:bg-surface-hover")}
          />
        }
      >
        <span aria-hidden className="truncate pl-1 text-fg-secondary">
          {def.abbr}
        </span>
        <span
          aria-hidden
          className="relative h-3 before:absolute before:inset-y-[-0.4375rem] before:left-1/2 before:w-px before:bg-line-strong after:absolute after:inset-y-[-0.4375rem] after:left-[95%] after:w-px after:bg-line"
        >
          <HeadToHeadBar pct={pct} />
        </span>
        <span aria-hidden className="text-right font-[560] tabular-nums text-fg">
          {statText(line, line.value)}
        </span>
        <span aria-hidden className="pr-1 text-right type-label tabular-nums text-fg-muted">
          {Number.isNaN(pct) ? EMPTY_VALUE : Math.round(pct)}
        </span>
      </TooltipTrigger>
      <TooltipContent className="flex-col items-start">
        <StatTip label={def.label} description={def.description} unit={def.unit} />
        {tip && <span className="type-caption tabular-nums text-fg-muted">{tip}</span>}
      </TooltipContent>
    </Tooltip>
  );
}
