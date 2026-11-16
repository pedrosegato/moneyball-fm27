import { RadioGroup } from "@base-ui/react/radio-group";
import { type ReactNode, useMemo } from "react";
import { PitchMarkings } from "@/components/PitchMarkings";
import type { PlayerRecord } from "@/data/types";
import type { RolePhase } from "@/engine/roles/catalog";
import type { ShapeSlot } from "@/engine/tacticShape";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/index";
import type { RolePerf } from "../lib/performance";
import { freeSpots, layoutSpots } from "../lib/pitchView";
import { gridPlace, PITCH_COLUMNS, PITCH_ROWS, readingOrder } from "../lib/slots";
import { FreeSpot } from "./FreeSpot";
import { PitchSlot } from "./PitchSlot";
import { SlotCard } from "./SlotCard";

const gridOf = (rowMin: string) => ({
  gridTemplateColumns: `repeat(${PITCH_COLUMNS}, minmax(0, 1fr))`,
  gridTemplateRows: `repeat(${PITCH_ROWS}, minmax(${rowMin}, 1fr))`,
});
const GRID = gridOf("2.75rem");
const TALL_GRID = gridOf("4rem");

const PITCH_SPACING = [
  "[--pitch-px:0.75rem] [--pitch-py:0.5rem] [--pitch-gx:0.5rem] [--pitch-gy:0.25rem]",
  "@max-[28rem]/pitch:[--pitch-px:0.5rem] @max-[28rem]/pitch:[--pitch-gx:0.375rem]",
  "@max-[12rem]/pitch:[--pitch-px:0.25rem] @max-[12rem]/pitch:[--pitch-gx:0.125rem]",
  "gap-x-(--pitch-gx) gap-y-(--pitch-gy) px-(--pitch-px) py-(--pitch-py)",
].join(" ");

export interface TacticPitchProps {
  players: readonly PlayerRecord[];
  slots: readonly ShapeSlot[];
  xi: readonly (number | null)[];
  layout: RolePhase;
  shown: readonly RolePhase[];
  editable: boolean;
  label: string;
  needs: ReadonlySet<number>;
  selected: number;
  onSelect(slot: number): void;
  perfOf: RolePerf;
  className?: string;
  children?: ReactNode;
}

export function TacticPitch({
  players,
  slots,
  xi,
  layout,
  shown,
  editable,
  label,
  needs,
  selected,
  onSelect,
  perfOf,
  className,
  children,
}: TacticPitchProps) {
  const poolMinutes = useAppStore((s) => s.settings.engine.poolMinutes);
  const spots = useMemo(() => layoutSpots(slots, layout), [slots, layout]);
  const free = useMemo(() => (editable ? freeSpots(spots) : []), [editable, spots]);
  return (
    <div className={cn("@container/pitch flex", className)}>
      <RadioGroup
        aria-label={label}
        value={String(selected)}
        onValueChange={(v) => onSelect(Number(v))}
        onKeyDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-drag-handle]")) e.preventBaseUIHandler();
        }}
        style={shown.length > 1 ? TALL_GRID : GRID}
        className={cn(
          "relative grid min-h-0 flex-1 items-center rounded-xl border border-line bg-surface-rail",
          PITCH_SPACING,
        )}
      >
        <PitchMarkings />
        {children}
        {free.map((spot) => (
          <FreeSpot key={`${spot.row},${spot.col}`} spot={spot} slots={slots} players={players} />
        ))}
        {readingOrder(spots).map((s) => {
          const card = {
            slot: s,
            shape: slots[s],
            spot: spots[s],
            players,
            holder: xi[s] ?? null,
            layout,
            shown,
            perfOf,
            poolMinutes,
            need: needs.has(s),
          };
          return editable ? (
            <PitchSlot key={s} {...card} chosen={s === selected} onSelect={onSelect} />
          ) : (
            <div key={s} style={gridPlace(spots[s])} className="relative min-w-0">
              <SlotCard {...card} editable={false} />
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
