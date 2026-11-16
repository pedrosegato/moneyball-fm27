import { THEME_KEY } from "@/lib/storageKeys";
import type { AppStore } from "./index";
import type { Theme } from "./settings";

function applyTheme(theme: Theme, keepCopy: boolean) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  if (!keepCopy) return;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.warn("Não foi possível guardar o tema para a próxima abertura", e);
  }
}

function switchTheme(theme: Theme, keepCopy: boolean) {
  const keyboard = document.documentElement.dataset.input === "keyboard";
  if (!keyboard && typeof document.startViewTransition === "function") {
    document.startViewTransition(() => applyTheme(theme, keepCopy));
  } else applyTheme(theme, keepCopy);
}

export function syncTheme(store: AppStore, { keepCopy = true }: { keepCopy?: boolean } = {}): () => void {
  applyTheme(store.getState().settings.theme, keepCopy);
  return store.subscribe((s, prev) => {
    if (s.settings.theme !== prev.settings.theme) switchTheme(s.settings.theme, keepCopy);
  });
}
