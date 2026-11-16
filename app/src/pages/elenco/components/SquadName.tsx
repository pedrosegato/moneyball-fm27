import { type ReactNode, useMemo } from "react";
import { useLineupDrag } from "../hooks/useLineupDrag";
import { playerId } from "../lib/dnd";
import { elencoT } from "../lib/elencoT";

interface SquadNameProps {
  uid: number;
  index: number;
  name: string;
  active: boolean;
  children: ReactNode;
}

export function SquadName({ uid, index, name, active, children }: SquadNameProps) {
  const drag = useLineupDrag(
    playerId(uid),
    useMemo(() => ({ index }), [index]),
  );
  return (
    <div
      ref={drag.setNodeRef}
      onPointerDown={drag.onPointerDown}
      data-dragging={drag.isDragging || undefined}
      className="relative flex min-w-0 cursor-grab items-center gap-1 active:cursor-grabbing data-dragging:opacity-40"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">{children}</div>
      <button
        type="button"
        {...drag.handle}
        tabIndex={active ? 0 : -1}
        aria-label={elencoT("drag.squadHandle", { name })}
        className="pointer-events-none absolute -inset-1 rounded-sm opacity-0 focus-ring focus-visible:opacity-100"
      />
    </div>
  );
}
