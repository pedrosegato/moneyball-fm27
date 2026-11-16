import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import type { AnalysisResult } from "@/engine/index";
import { useLastInput } from "@/lib/useLastInput";
import { useAppStore } from "@/store/index";
import { returnTarget } from "../lib/returnTarget";
import { useEscapeToClose } from "./useEscapeToClose";
import { useSheetOpener } from "./useSheetOpener";
import { isOpenAtOnce, useSheetPresence } from "./useSheetPresence";

export function usePlayerSheet(analysis: AnalysisResult | null) {
  const { selectedUid, selectPlayer } = useAppStore(
    useShallow((s) => ({ selectedUid: s.ui.selectedUid, selectPlayer: s.selectPlayer })),
  );
  const panel = useRef<HTMLDialogElement>(null);
  const lastInput = useLastInput();
  const shown = useSheetPresence(selectedUid, panel, lastInput);
  const opener = useSheetOpener(selectedUid, panel);

  const close = () => {
    if (selectedUid === null) return;
    const active = document.activeElement;
    if (!active || active === document.body || panel.current?.contains(active)) {
      returnTarget(selectedUid, opener.current)?.focus({ preventScroll: true });
    }
    selectPlayer(null);
  };

  const closeIfGone = useEffectEvent((uid: number | null, current: AnalysisResult | null) => {
    if (uid !== null && current && !current.uids.includes(uid)) close();
  });
  useEffect(() => closeIfGone(selectedUid, analysis), [selectedUid, analysis]);
  useEscapeToClose({ open: selectedUid !== null, panel, opener, onClose: close });

  const focusTarget = shown && isOpenAtOnce(shown) ? shown.uid : null;
  useLayoutEffect(() => {
    if (focusTarget !== null) panel.current?.focus({ preventScroll: true });
  }, [focusTarget]);

  return { panel, shown, close };
}
