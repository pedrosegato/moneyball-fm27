import { CircleAlert } from "lucide-react";
import { ScoreCell } from "@/components/ScoreCell";
import { formatScore } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DropFit } from "../lib/dnd";
import { elencoT } from "../lib/elencoT";
import type { RoleReading } from "../lib/slotReadings";
import { FitBadge } from "./FitBadge";
import { RoleBand } from "./RoleBand";

const ROLE_ROW =
  "flex min-w-0 items-center gap-1 @max-[28rem]/pitch:flex-col @max-[28rem]/pitch:items-stretch @max-[28rem]/pitch:gap-px";
const BAND =
  "h-5 min-w-0 flex-1 justify-start px-1.5 @max-[28rem]/pitch:h-[1.125rem] @max-[28rem]/pitch:flex-none @max-[28rem]/pitch:justify-center @max-[28rem]/pitch:px-0.5 @max-[12rem]/pitch:hidden";
const SCORE =
  "min-w-8 shrink-0 px-1 @max-[28rem]/pitch:h-5 @max-[28rem]/pitch:w-full @max-[28rem]/pitch:justify-center @max-[12rem]/pitch:min-w-0 @max-[12rem]/pitch:px-0";
const WHO =
  "-mr-1 flex min-w-0 items-baseline gap-0.5 type-label @max-[28rem]/pitch:order-last @max-[28rem]/pitch:-mx-0.5 @max-[28rem]/pitch:justify-center @max-[28rem]/pitch:type-caption @max-[12rem]/pitch:hidden";
const CORNER = "absolute -top-1.5 -right-1.5";

interface SlotCardBodyProps {
  number: number | null;
  surname: string | null;
  readings: readonly RoleReading[];
  reason: string | undefined;
  need: boolean;
  fit: DropFit;
}

export function SlotCardBody({ number, surname, readings, reason, need, fit }: SlotCardBodyProps) {
  const who = (
    <span className={WHO}>
      {number != null && (
        <span
          data-slot="shirt-number"
          className="shrink-0 type-caption tabular-nums text-fg-muted @max-[28rem]/pitch:hidden"
        >
          {number}
        </span>
      )}
      <span data-slot="player-name" className={cn("truncate", surname === null ? "text-fg-faint" : "text-fg")}>
        {surname ?? elencoT("pitch.empty")}
      </span>
    </span>
  );
  const nameFirst = readings.length > 1;
  const roles = readings.map(({ role, perf }) => (
    <span key={role.id} className={ROLE_ROW}>
      <RoleBand role={role} className={BAND} />
      <ScoreCell
        value={perf}
        label={elencoT("pitch.perfInRole")}
        format={formatScore}
        emptyReason={reason}
        className={SCORE}
      />
    </span>
  ));
  return (
    <>
      {fit ? (
        <FitBadge fit={fit} className={CORNER} />
      ) : (
        need && (
          <CircleAlert aria-hidden className={cn(CORNER, "size-3.5 rounded-full bg-surface-raised text-destructive")} />
        )
      )}
      {nameFirst && who}
      {roles}
      {!nameFirst && who}
    </>
  );
}
