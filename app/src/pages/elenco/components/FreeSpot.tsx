import { useDroppable } from "@dnd-kit/core";
import { Check, Plus, X } from "lucide-react";
import type { PlayerRecord } from "@/data/types";
import { positionAt, type ShapeSlot, type Spot } from "@/engine/tacticShape";
import { cn } from "@/lib/utils";
import { canMove, carriedFit, freeSpotId } from "../lib/dnd";
import { elencoT } from "../lib/elencoT";
import { gridPlace, positionName } from "../lib/slots";

const FIT_ICON = { good: Check, poor: X };
const FIT_TINT = {
  good: "border-solid border-success bg-success/12 text-success",
  poor: "border-solid border-destructive bg-danger-wash text-destructive",
};

interface FreeSpotProps {
  spot: Spot;
  slots: readonly ShapeSlot[];
  players: readonly PlayerRecord[];
}

export function FreeSpot({ spot, slots, players }: FreeSpotProps) {
  const place = positionAt(spot);
  const { setNodeRef, isOver, active } = useDroppable({ id: freeSpotId(spot) });
  const movable = active !== null && canMove(String(active.id), slots);
  const fit = movable && place ? carriedFit(active, players, place.position) : null;
  const over = fit !== null && isOver;
  const Icon = fit ? FIT_ICON[fit] : Plus;
  return (
    <div
      ref={setNodeRef}
      aria-hidden
      data-free-spot=""
      data-spot={`${spot.row},${spot.col}`}
      data-fit={fit ?? undefined}
      data-over={over || undefined}
      title={place ? elencoT("pitch.free", { slot: positionName(place.position) }) : undefined}
      style={gridPlace(spot)}
      className="grid min-w-0 self-stretch place-items-center"
    >
      <span
        className={cn(
          "grid h-12 w-full place-items-center rounded-lg border border-transparent",
          over && fit && cn(FIT_TINT[fit], "border-dashed"),
        )}
      >
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full border border-dashed",
            fit ? FIT_TINT[fit] : "border-line text-fg-faint",
          )}
        >
          <Icon className="size-3" strokeWidth={fit ? 3 : 2} />
        </span>
      </span>
    </div>
  );
}
