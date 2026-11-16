import { TriangleAlert } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDayMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProblemState } from "./plateState";

interface ProblemStripProps {
  state: ProblemState;
  onReload: () => void;
}

export function ProblemStrip({ state, onReload }: ProblemStripProps) {
  const { t } = useTranslation("shell");
  const detailId = useId();
  const detail = state.tone === "danger" ? state.detail : undefined;
  const danger = state.tone === "danger";
  const stripClass = cn(
    "flex h-7 min-w-0 shrink items-center gap-1.5 rounded-md px-2.5 text-fg focus-ring",
    danger ? "bg-danger-wash" : "bg-change-wash",
  );
  const strip = danger ? (
    <span
      role="alert"
      tabIndex={detail ? 0 : undefined}
      aria-describedby={detail ? detailId : undefined}
      className={stripClass}
    >
      <TriangleAlert className="size-3.5 shrink-0 text-destructive" aria-hidden />
      <span className="truncate">{state.label}</span>
    </span>
  ) : (
    <span role="status" aria-label={t("status.warning")} className={stripClass}>
      <span className="size-1.5 shrink-0 rounded-full bg-change" aria-hidden />
      <span className="truncate">
        {t("status.staleSummary", {
          dataDate: formatDayMonth(state.dataDate),
          gameDate: formatDayMonth(state.gameDate),
        })}{" "}
        <button
          type="button"
          onClick={onReload}
          className="rounded-xs font-semibold text-change-text underline decoration-change/60 underline-offset-2 focus-ring hover:decoration-change"
        >
          {t("status.staleReload")}
        </button>
      </span>
    </span>
  );
  if (!detail) return strip;
  return (
    <>
      <Tooltip>
        <TooltipTrigger render={strip} />
        <TooltipContent side="bottom" align="end">
          {detail}
        </TooltipContent>
      </Tooltip>
      <span id={detailId} className="sr-only">
        {detail}
      </span>
    </>
  );
}
