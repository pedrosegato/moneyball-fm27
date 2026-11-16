import { useDraggable } from "@dnd-kit/core";
import { type KeyboardEventHandler, type PointerEventHandler, use } from "react";
import type { DragData } from "../lib/dnd";
import { elencoT } from "../lib/elencoT";
import { LineupLock } from "../lib/lineupLock";

export function useLineupDrag(id: string, data: DragData | undefined) {
  const locked = use(LineupLock);
  const drag = useDraggable({
    id,
    data,
    disabled: locked || data === undefined,
    attributes: { roleDescription: elencoT("drag.roleDescription") },
  });
  return {
    isDragging: drag.isDragging,
    setNodeRef: drag.setNodeRef,
    onPointerDown: drag.listeners?.onPointerDown as PointerEventHandler | undefined,
    handle: {
      ref: drag.setActivatorNodeRef,
      ...drag.attributes,
      onKeyDown: drag.listeners?.onKeyDown as KeyboardEventHandler | undefined,
      "data-drag-handle": "",
    },
  };
}

export type DragHandleProps = ReturnType<typeof useLineupDrag>["handle"];
