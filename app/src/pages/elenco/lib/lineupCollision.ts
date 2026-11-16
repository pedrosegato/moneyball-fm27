import type { ClientRect, CollisionDetection } from "@dnd-kit/core";
import { freeSpotOf, OFF_PITCH, PITCH, slotOf } from "./dnd";

const within = (at: { x: number; y: number }, r: ClientRect) =>
  at.x >= r.left && at.x <= r.right && at.y >= r.top && at.y <= r.bottom;

export const lineupCollision =
  (keyboardOver: string | null, movable: (activeId: string) => boolean): CollisionDetection =>
  ({ active, pointerCoordinates: at, droppableRects }) => {
    if (!at) return keyboardOver ? [{ id: keyboardOver }] : [];
    const moves = movable(String(active.id));
    for (const [id, rect] of droppableRects) {
      const target = slotOf(id) !== null || (moves && freeSpotOf(id) !== null);
      if (target && within(at, rect)) return [{ id }];
    }
    const pitch = droppableRects.get(PITCH);
    return !pitch || within(at, pitch) || slotOf(active.id) === null ? [] : [{ id: OFF_PITCH }];
  };
