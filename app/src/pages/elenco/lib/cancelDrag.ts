const ESCAPE: KeyboardEventInit = { code: "Escape", key: "Escape", cancelable: true };

const markHandled = (event: KeyboardEvent) => event.preventDefault();

export function cancelLiveDrag() {
  window.addEventListener("keydown", markHandled, true);
  document.dispatchEvent(new KeyboardEvent("keydown", ESCAPE));
  window.removeEventListener("keydown", markHandled, true);
}
