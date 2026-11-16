import { type KeyboardCoordinateGetter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { keyboardStep } from "../lib/dnd";

const POINTER = { activationConstraint: { distance: 6 } };

export function useLineupSensors(targetsFor: (activeId: string) => readonly string[], start: string) {
  const [keyboardOver, setKeyboardOver] = useState<string | null>(null);
  const live = useRef({ targetsFor, start });
  useLayoutEffect(() => {
    live.current = { targetsFor, start };
  });

  const coordinateGetter = useCallback<KeyboardCoordinateGetter>((event, { active, context }) => {
    const { targetsFor, start } = live.current;
    const from = String(context.over?.id ?? active);
    const next = keyboardStep(targetsFor(String(active)), from, event.code, start);
    if (next === null) return undefined;
    event.preventDefault();
    setKeyboardOver(next);
    return undefined;
  }, []);
  const keyboard = useMemo(() => ({ coordinateGetter }), [coordinateGetter]);
  const sensors = useSensors(useSensor(PointerSensor, POINTER), useSensor(KeyboardSensor, keyboard));
  const releaseKeyboard = useCallback(() => setKeyboardOver(null), []);
  return { sensors, keyboardOver, releaseKeyboard };
}
