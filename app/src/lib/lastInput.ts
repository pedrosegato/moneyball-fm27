import type { Input } from "./useLastInput";

export function trackLastInput(root: HTMLElement = document.documentElement): () => void {
  const mark = (input: Input) => {
    if (root.dataset.input !== input) root.dataset.input = input;
  };
  const keyboard = () => mark("keyboard");
  const pointer = () => mark("pointer");
  mark("pointer");
  document.addEventListener("keydown", keyboard, true);
  document.addEventListener("pointerdown", pointer, true);
  document.addEventListener("pointermove", pointer, { capture: true, passive: true });
  return () => {
    document.removeEventListener("keydown", keyboard, true);
    document.removeEventListener("pointerdown", pointer, true);
    document.removeEventListener("pointermove", pointer, true);
  };
}
