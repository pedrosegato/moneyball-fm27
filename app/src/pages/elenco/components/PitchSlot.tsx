import { cn } from "@/lib/utils";
import { useSlotDrop } from "../hooks/useSlotDrop";
import { elencoT } from "../lib/elencoT";
import { gridPlace, positionName } from "../lib/slots";
import { SlotCard, type SlotCardProps } from "./SlotCard";
import { SlotDragHandle } from "./SlotDragHandle";

interface PitchSlotProps extends SlotCardProps {
  chosen: boolean;
  onSelect(slot: number): void;
}

export function PitchSlot({ chosen, onSelect, ...card }: PitchSlotProps) {
  const { slot, holder, players, shape, layout, spot } = card;
  const position = shape[layout].position;
  const { drag, setNode, isOver, fit } = useSlotDrop(slot, holder, position, players);
  return (
    <div
      ref={setNode}
      style={gridPlace(spot)}
      onPointerDown={drag.onPointerDown}
      className={cn("group/slot relative min-w-0 touch-none", holder !== null && "cursor-grab active:cursor-grabbing")}
    >
      <SlotCard {...card} editable drop={{ fit, over: isOver, dragging: drag.isDragging }} />
      <SlotDragHandle
        handle={drag.handle}
        label={elencoT("pitch.move", { slot: positionName(position) })}
        empty={holder === null}
        tabbable={chosen && holder !== null}
        onClick={() => onSelect(slot)}
      />
    </div>
  );
}
