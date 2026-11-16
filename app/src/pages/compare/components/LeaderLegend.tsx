import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LEADER_OUTLINE } from "../lib/slotStyles";

export function LeaderLegend() {
  const { t } = useTranslation("compare");
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="focus-ring ml-auto flex items-center gap-2 rounded-xs type-caption text-fg-muted"
          />
        }
      >
        <span
          aria-hidden
          className={cn("h-2.5 w-4 rounded-[3px] bg-surface-active", LEADER_OUTLINE, "outline-offset-1")}
        />
        {t("stats.leader")}
      </TooltipTrigger>
      <TooltipContent>{t("stats.leaderTip")}</TooltipContent>
    </Tooltip>
  );
}
