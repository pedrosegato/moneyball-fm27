import { useTranslation } from "react-i18next";
import { ScoreCell } from "@/components/ScoreCell";
import type { PlayerRecord } from "@/data/types";
import { type RolePhase, roleById } from "@/engine/roles/catalog";
import type { ShapeSlot } from "@/engine/tacticShape";
import { formatScore } from "@/lib/format";
import { playerName, playerSurname } from "@/lib/playerName";
import { cn } from "@/lib/utils";
import type { Carried } from "../hooks/useLineupDnd";
import { landingShape, OFF_PITCH, slotOf } from "../lib/dnd";
import { type RolePerf, rolePerfIn } from "../lib/performance";
import { RoleBand } from "./RoleBand";

const CARD =
  "flex h-full min-w-0 cursor-grabbing flex-col justify-center gap-0.5 rounded-lg border bg-surface-raised shadow-lg select-none";

interface CarriedCopyProps {
  carried: Carried;
  players: readonly PlayerRecord[];
  slots: readonly ShapeSlot[];
  layout: RolePhase;
  perfOf: RolePerf;
  over: string | null;
}

export function CarriedCopy({ carried, players, slots, layout, perfOf, over }: CarriedCopyProps) {
  const { t } = useTranslation("elenco");
  const player = players[carried.index];
  const slot = slotOf(carried.id);
  if (slot === null) {
    return (
      <div className={cn(CARD, "border-signal px-3")}>
        <span className="truncate leading-[18px] font-[550] text-fg">{playerName(player)}</span>
        {player.position && <span className="truncate type-caption text-fg-muted">{player.position}</span>}
      </div>
    );
  }
  const offPitch = over === OFF_PITCH;
  const shape = landingShape(slots, slot, layout, over);
  const role = roleById(shape[layout].roleId);
  return (
    <div className="@container/copy h-full">
      <div
        className={cn(
          CARD,
          "pr-1.5 pl-3 @max-[5rem]/copy:items-stretch @max-[5rem]/copy:px-1",
          offPitch ? "border-dashed border-destructive" : "border-signal",
        )}
      >
        <span className="flex min-w-0 items-center gap-1 @max-[5rem]/copy:flex-col @max-[5rem]/copy:items-stretch @max-[5rem]/copy:gap-px">
          {offPitch ? (
            <span className="min-w-0 truncate type-caption font-[600] text-destructive">{t("drag.leavesXi")}</span>
          ) : (
            <>
              {role && (
                <RoleBand
                  role={role}
                  className="h-5 min-w-0 flex-1 justify-start px-1.5 @max-[5rem]/copy:h-[1.125rem] @max-[5rem]/copy:flex-none @max-[5rem]/copy:justify-center @max-[5rem]/copy:px-0.5"
                />
              )}
              <ScoreCell
                value={rolePerfIn(perfOf, carried.index, shape, layout)}
                label={t("pitch.perfInRole")}
                format={formatScore}
                className="min-w-8 shrink-0 px-1 @max-[5rem]/copy:w-full @max-[5rem]/copy:justify-center"
              />
            </>
          )}
        </span>
        <span className="flex min-w-0 items-baseline gap-1 type-label @max-[5rem]/copy:justify-center @max-[5rem]/copy:type-caption">
          {player.squad_number != null && (
            <span className="shrink-0 type-caption tabular-nums text-fg-muted @max-[5rem]/copy:hidden">
              {player.squad_number}
            </span>
          )}
          <span className="truncate text-fg">{playerSurname(player)}</span>
        </span>
      </div>
    </div>
  );
}
