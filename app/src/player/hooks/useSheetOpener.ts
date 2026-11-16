import { type RefObject, useLayoutEffect, useRef } from "react";

export function useSheetOpener(selectedUid: number | null, panel: RefObject<HTMLElement | null>) {
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (selectedUid === null) return;
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || active === document.body) opener.current = null;
    else if (!panel.current?.contains(active)) opener.current = active;
  }, [selectedUid, panel]);
  return opener;
}
