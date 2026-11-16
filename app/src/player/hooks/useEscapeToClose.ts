import { type RefObject, useEffect, useEffectEvent } from "react";
import { PLAYER_ROW } from "@/table/lib/domSelectors";

interface EscapeOptions {
  open: boolean;
  panel: RefObject<HTMLElement | null>;
  opener: RefObject<HTMLElement | null>;
  onClose(): void;
}

export function useEscapeToClose({ open, panel, opener, onClose }: EscapeOptions) {
  const onEscape = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    const target = e.target instanceof Element ? e.target : null;
    const ours =
      !target ||
      target === document.body ||
      panel.current?.contains(target) ||
      target.closest(PLAYER_ROW) ||
      opener.current?.contains(target);
    if (!ours) return;
    e.preventDefault();
    onClose();
  });
  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [open]);
}
