import { type RefObject, useEffect, useRef } from "react";

export type Input = "keyboard" | "pointer";

export function useLastInput(): RefObject<Input> {
  const last = useRef<Input>("pointer");
  useEffect(() => {
    const keyboard = () => (last.current = "keyboard");
    const pointer = () => (last.current = "pointer");
    document.addEventListener("keydown", keyboard, true);
    document.addEventListener("pointerdown", pointer, true);
    return () => {
      document.removeEventListener("keydown", keyboard, true);
      document.removeEventListener("pointerdown", pointer, true);
    };
  }, []);
  return last;
}
