import { useEffect } from "react";

export function useClaimEscape(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const claim = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    window.addEventListener("keydown", claim, true);
    return () => window.removeEventListener("keydown", claim, true);
  }, [active]);
}
