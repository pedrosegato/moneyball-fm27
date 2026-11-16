import { Radio } from "@base-ui/react/radio";
import type { PlayerRecord } from "@/data/types";
import type { RolePhase } from "@/engine/roles/catalog";
import type { ShapeSlot, Spot } from "@/engine/tacticShape";
import { playerName, playerSurname } from "@/lib/playerName";
import { cn } from "@/lib/utils";
import type { DropFit } from "../lib/dnd";
import type { RolePerf } from "../lib/performance";
import { slotAriaLabel, slotTitle } from "../lib/pitchSlotText";
import { noScoreReason, slotReadings } from "../lib/slotReadings";
import { positionName } from "../lib/slots";
import { SlotCardBody } from "./SlotCardBody";

export interface SlotDropState {
  fit: DropFit;
  over: boolean;
  dragging: boolean;
}

function slotCardClass(empty: boolean, need: boolean, editable: boolean): string {
  const border = need ? "border-destructive" : empty ? "border-line-strong" : "border-line";
  return cn(
    "relative flex w-full min-w-0 flex-col justify-center gap-0.5 rounded-lg border bg-surface-raised py-1 text-left focus-ring select-none hover:not-data-checked:not-data-fit:bg-surface-hover",
    editable ? "pr-1.5 pl-3" : "px-1.5",
    empty || !editable ? "cursor-default" : "cursor-grab",
    empty && "border-dashed",
    "@max-[28rem]/pitch:px-1 @max-[28rem]/pitch:py-0.5 @max-[12rem]/pitch:px-0.5",
    "data-checked:outline-2 data-checked:outline-offset-2 data-checked:outline-signal data-checked:not-data-over:outline-solid data-checked:not-data-fit:border-signal data-checked:not-data-fit:bg-signal-wash",
    border,
    "data-[fit=good]:border-solid data-[fit=good]:border-success data-[fit=good]:bg-success/12",
    "data-[fit=poor]:border-solid data-[fit=poor]:border-destructive data-[fit=poor]:bg-danger-wash",
    "data-over:outline-2 data-over:outline-offset-2 data-over:outline-dashed data-over:outline-fg-secondary",
    "data-dragging:opacity-40",
  );
}

export interface SlotCardProps {
  slot: number;
  shape: ShapeSlot;
  spot: Spot;
  players: readonly PlayerRecord[];
  holder: number | null;
  layout: RolePhase;
  shown: readonly RolePhase[];
  perfOf: RolePerf;
  poolMinutes: number;
  need: boolean;
}

interface SlotCardOwnProps extends SlotCardProps {
  editable: boolean;
  drop?: SlotDropState;
}

export function SlotCard({
  slot,
  shape,
  spot,
  players,
  holder,
  layout,
  shown,
  perfOf,
  poolMinutes,
  need,
  editable,
  drop,
}: SlotCardOwnProps) {
  const player = holder === null ? null : players[holder];
  const name = player ? playerName(player) : null;
  const readings = slotReadings(shape, holder, shown, layout, perfOf);
  return (
    <Radio.Root
      value={String(slot)}
      data-spot={`${spot.row},${spot.col}`}
      data-fit={drop?.fit ?? undefined}
      data-over={drop?.over || undefined}
      data-dragging={drop?.dragging || undefined}
      aria-label={slotAriaLabel(positionName(shape[layout].position), name, readings, need)}
      title={slotTitle(name, need)}
      className={slotCardClass(player === null, need, editable)}
    >
      <SlotCardBody
        number={player?.squad_number ?? null}
        surname={player ? playerSurname(player) : null}
        readings={readings}
        reason={noScoreReason(player, poolMinutes)}
        need={need}
        fit={drop?.fit ?? null}
      />
    </Radio.Root>
  );
}
