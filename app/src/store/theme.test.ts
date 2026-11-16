import { THEME_KEY } from "@/lib/storageKeys";
import { createAppStore } from "./index";
import { syncTheme } from "./theme";

describe("syncTheme", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.add("dark");
  });

  it("puts the store's theme on the page and keeps a copy the page reads before it paints", () => {
    const store = createAppStore();
    store.getState().updateSettings({ theme: "light" });
    const stop = syncTheme(store);
    expect(document.documentElement).not.toHaveClass("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");

    store.getState().updateSettings({ theme: "dark" });
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");

    stop();
    store.getState().updateSettings({ theme: "light" });
    expect(document.documentElement).toHaveClass("dark");
  });

  it("still themes the page where the copy cannot be written", () => {
    const store = createAppStore();
    store.getState().updateSettings({ theme: "light" });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    try {
      syncTheme(store)();
      expect(document.documentElement).not.toHaveClass("dark");
    } finally {
      setItem.mockRestore();
    }
  });

  it("cross-fades a theme the user switches with the pointer, never the one the boot applies or a keyboard switch", () => {
    const transition = vi.fn((update: () => void) => {
      update();
      return {};
    });
    Object.assign(document, { startViewTransition: transition });
    const root = document.documentElement;
    try {
      const store = createAppStore();
      root.dataset.input = "pointer";
      const stop = syncTheme(store);
      expect(transition).not.toHaveBeenCalled();

      store.getState().updateSettings({ theme: "light" });
      expect(transition).toHaveBeenCalledOnce();
      expect(root).not.toHaveClass("dark");

      root.dataset.input = "keyboard";
      store.getState().updateSettings({ theme: "dark" });
      expect(transition).toHaveBeenCalledOnce();
      expect(root).toHaveClass("dark");
      stop();
    } finally {
      delete (document as { startViewTransition?: unknown }).startViewTransition;
      delete root.dataset.input;
    }
  });
});
