import type { DropAnimationFunction } from "@dnd-kit/core";

const SETTLE_MS = 150;
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

export const reducedMotion = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const settleHome =
  (shouldSettle: () => boolean): DropAnimationFunction =>
  ({ active, dragOverlay, transform }) => {
    if (!shouldSettle()) return;
    const home = {
      x: transform.x - (dragOverlay.rect.left - active.rect.left),
      y: transform.y - (dragOverlay.rect.top - active.rect.top),
    };
    const at = (p: { x: number; y: number }) => ({ transform: `translate3d(${p.x}px, ${p.y}px, 0)` });
    const source = active.node;
    source.style.opacity = "0";
    const flight = dragOverlay.node.animate([at(transform), at(home)], {
      duration: SETTLE_MS,
      easing: EASE_OUT,
      fill: "forwards",
    });
    const restore = () => {
      source.style.opacity = "";
    };
    return flight.finished.then(restore, restore);
  };
