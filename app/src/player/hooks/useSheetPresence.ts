import { type RefObject, useLayoutEffect, useState } from "react";
import type { Input } from "@/lib/useLastInput";

const PHASE = { starting: "starting", open: "open", ending: "ending" } as const;
type Phase = (typeof PHASE)[keyof typeof PHASE];

export interface SheetPresence {
  uid: number;
  phase: Phase;
  instant: boolean;
}

function nextShown(prev: SheetPresence | null, selectedUid: number | null, instant: boolean): SheetPresence | null {
  if (selectedUid === null) return !prev || instant ? null : { ...prev, phase: PHASE.ending, instant: false };
  if (!prev) return { uid: selectedUid, phase: instant ? PHASE.open : PHASE.starting, instant };
  return { uid: selectedUid, phase: PHASE.open, instant };
}

export function useSheetPresence(
  selectedUid: number | null,
  panel: RefObject<HTMLElement | null>,
  lastInput: RefObject<Input>,
): SheetPresence | null {
  const [shown, setShown] = useState<SheetPresence | null>(null);
  const [seenUid, setSeenUid] = useState<number | null>(null);
  if (seenUid !== selectedUid) {
    setSeenUid(selectedUid);
    setShown(nextShown(shown, selectedUid, lastInput.current === "keyboard"));
  }

  const phase = shown?.phase;
  useLayoutEffect(() => {
    if (phase !== PHASE.starting) return;
    void panel.current?.getBoundingClientRect();
    const frame = requestAnimationFrame(() =>
      setShown((prev) => (prev?.phase === PHASE.starting ? { ...prev, phase: PHASE.open } : prev)),
    );
    return () => cancelAnimationFrame(frame);
  }, [phase, panel]);

  useLayoutEffect(() => {
    if (phase !== PHASE.ending) return;
    let current = true;
    const animations = panel.current?.getAnimations?.() ?? [];
    void Promise.allSettled(animations.map((a) => a.finished)).then(() => {
      if (current) setShown((prev) => (prev?.phase === PHASE.ending ? null : prev));
    });
    return () => {
      current = false;
    };
  }, [phase, panel]);

  return shown;
}

export const isStarting = (shown: SheetPresence) => shown.phase === PHASE.starting;
export const isEnding = (shown: SheetPresence) => shown.phase === PHASE.ending;
export const isOpenAtOnce = (shown: SheetPresence) => shown.instant && shown.phase === PHASE.open;
