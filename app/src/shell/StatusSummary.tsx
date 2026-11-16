import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { myClub } from "@/data/myClub";
import { formatDate } from "@/lib/format";
import type { DataState } from "@/store/data";
import { ClubAndDate } from "./ClubAndDate";
import type { PlateState } from "./plateState";

interface StatusSummaryProps {
  state: PlateState;
  snapshot: DataState["snapshot"];
  details: string[];
}

function summaryContent(state: PlateState, snapshot: DataState["snapshot"]): ReactNode {
  if (state.tone === "working" || (state.tone === "idle" && !snapshot))
    return <span className="truncate">{state.label}</span>;
  const club = snapshot ? (myClub(snapshot)?.name ?? null) : null;
  const date = snapshot?.date ? formatDate(snapshot.date) : null;
  return club || date ? <ClubAndDate club={club} date={date} /> : null;
}

export function StatusSummary({ state, snapshot, details }: StatusSummaryProps) {
  const { t } = useTranslation("shell");
  const descriptionId = useId();
  const content = summaryContent(state, snapshot);

  const region = (
    <span
      role="status"
      aria-label={t("status.reading")}
      aria-describedby={content ? descriptionId : undefined}
      tabIndex={content ? 0 : undefined}
      className="flex h-7 items-center gap-1.5 rounded-md px-1.5 type-label tabular-nums whitespace-nowrap text-fg-muted focus-ring"
    />
  );
  if (!content) return region;
  return (
    <>
      <Tooltip>
        <TooltipTrigger render={region}>{content}</TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="flex-col items-start gap-0.5 tabular-nums">
          {details.map((line, k) => (
            <span key={line} className={k === 0 ? "text-fg" : "text-fg-muted"}>
              {line}
            </span>
          ))}
        </TooltipContent>
      </Tooltip>
      <span id={descriptionId} className="sr-only">
        {details.map((line) => `${line}.`).join(" ")}
      </span>
    </>
  );
}
