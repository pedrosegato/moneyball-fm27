import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlayerRecord } from "@/data/types";
import type { RolePhase } from "@/engine/roles/catalog";
import type { ShapeSlot } from "@/engine/tacticShape";
import { cancelLiveDrag } from "../lib/cancelDrag";
import { canMove, carriedIndex, dropEdit, dropTargets, slotId } from "../lib/dnd";
import { lineupAnnouncements, lineupInstructions } from "../lib/lineupAnnouncements";
import { lineupCollision } from "../lib/lineupCollision";
import type { EditableLineup } from "../lib/lineupEdits";
import { reducedMotion, settleHome } from "../lib/settleAnimation";
import { useClaimEscape } from "./useClaimEscape";
import { useLineupSensors } from "./useLineupSensors";

export interface Carried {
  id: string;
  index: number;
  keyboard: boolean;
}

export interface LineupDndOptions {
  players: readonly PlayerRecord[];
  slots: readonly ShapeSlot[];
  layout: RolePhase;
  selected: number;
  onEdit(change: (lineup: EditableLineup) => EditableLineup | null): boolean;
}

const byKeyboard = (event: Event | null) => event instanceof KeyboardEvent;

export function useLineupDnd({ players, slots, layout, selected, onEdit }: LineupDndOptions) {
  const [carried, setCarried] = useState<Carried | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const targetsFor = useCallback((activeId: string) => dropTargets(activeId, slots, layout), [slots, layout]);
  const movable = useCallback((activeId: string) => canMove(activeId, slots), [slots]);
  const { sensors, keyboardOver, releaseKeyboard } = useLineupSensors(targetsFor, slotId(selected));
  const settle = useRef(false);
  const dropChanged = useRef(false);
  const dragging = useRef(false);
  useClaimEscape(carried !== null);
  useEffect(
    () => () => {
      if (dragging.current) cancelLiveDrag();
    },
    [],
  );

  const collisionDetection = useMemo(() => lineupCollision(keyboardOver, movable), [keyboardOver, movable]);
  const dropAnimation = useMemo(() => settleHome(() => settle.current), []);
  const screenReaderInstructions = useMemo(lineupInstructions, []);
  const announcements = lineupAnnouncements({
    players,
    slots,
    layout,
    dropChanged: () => dropChanged.current,
  });

  const finish = (keyboardDrag: boolean, edited: boolean) => {
    dragging.current = false;
    settle.current = !keyboardDrag && !edited && !reducedMotion();
    setCarried(null);
    setOver(null);
    releaseKeyboard();
  };

  return {
    carried,
    over,
    dropAnimation,
    context: {
      sensors,
      collisionDetection,
      accessibility: { announcements, screenReaderInstructions },
      onDragStart: ({ active, activatorEvent }: DragStartEvent) => {
        dragging.current = true;
        const index = carriedIndex(active);
        if (index !== null) setCarried({ id: String(active.id), index, keyboard: byKeyboard(activatorEvent) });
      },
      onDragOver: ({ over }: DragOverEvent) => setOver(over ? String(over.id) : null),
      onDragEnd: ({ active, over, activatorEvent }: DragEndEvent) => {
        const target = over ? String(over.id) : null;
        dropChanged.current = onEdit((lineup) => dropEdit(String(active.id), target, lineup, layout));
        finish(byKeyboard(activatorEvent), dropChanged.current);
      },
      onDragCancel: ({ activatorEvent }: DragEndEvent) => finish(byKeyboard(activatorEvent), false),
    },
  };
}
