import { useDroppable } from "@dnd-kit/core";
import { useCallback, useMemo } from "react";
import type { PlayerRecord } from "@/data/types";
import type { PosName } from "@/engine/positions";
import { carriedFit, slotId } from "../lib/dnd";
import { useLineupDrag } from "./useLineupDrag";

export function useSlotDrop(s: number, i: number | null, position: PosName, players: readonly PlayerRecord[]) {
  const id = slotId(s);
  const { setNodeRef: setDropNode, isOver, active } = useDroppable({ id });
  const drag = useLineupDrag(
    id,
    useMemo(() => (i === null ? undefined : { index: i }), [i]),
  );
  const { setNodeRef: setDragNode } = drag;
  const setNode = useCallback(
    (node: HTMLElement | null) => {
      setDropNode(node);
      setDragNode(node);
    },
    [setDropNode, setDragNode],
  );
  return { drag, setNode, isOver, fit: carriedFit(active, players, position) };
}
