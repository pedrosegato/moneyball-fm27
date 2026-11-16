import { STORAGE_PREFIX, THEME_KEY } from "@/lib/storageKeys";
import { bootApp } from "./boot";
import type { DataController } from "./controller";
import { createAppStore } from "./index";
import { type KeyValueStorage, memoryStorage } from "./persist";

const STORAGE_NOTICE = "Não foi possível abrir as configurações salvas; usando padrões";
const UNREADABLE_NOTICE =
  "Não foi possível ler parte das configurações salvas; mudanças nelas não serão salvas nesta sessão.";
const RESTORE_NOTICE =
  "Não foi possível ler as configurações salvas; usando padrões, sem salvar mudanças nesta sessão.";

const controller = () =>
  ({
    start: vi.fn(),
    stop: vi.fn(),
    reload: vi.fn(async () => {}),
  }) satisfies DataController;

describe("bootApp", () => {
  it("restores the saved state, keeps saving it and then starts reading the game", async () => {
    const storage = memoryStorage();
    await storage.set(`${STORAGE_PREFIX}settings`, { theme: "light" });
    const store = createAppStore();
    const data = controller();
    data.start.mockImplementation(() => expect(store.getState().settings.theme).toBe("light"));

    const persistence = await bootApp({ store, controller: data, open: async () => ({ storage, fallback: false }) });

    expect(data.start).toHaveBeenCalledOnce();
    expect(store.getState().ui.notice).toBeNull();
    store.getState().setMode("percentile");
    await persistence.flush();
    expect(await storage.get(`${STORAGE_PREFIX}ui`)).toMatchObject({ mode: "percentile" });
    persistence.stop();
  });

  it("tells the user once when the saved settings could not be opened", async () => {
    const store = createAppStore();
    const data = controller();
    const persistence = await bootApp({
      store,
      controller: data,
      open: async () => ({ storage: memoryStorage(), fallback: true }),
    });
    expect(store.getState().ui.notice).toBe(STORAGE_NOTICE);
    expect(data.start).toHaveBeenCalledOnce();
    persistence.stop();
  });

  it("themes the page with the saved theme only once it is restored, then follows it", async () => {
    const storage = memoryStorage();
    await storage.set(`${STORAGE_PREFIX}settings`, { theme: "light" });
    const store = createAppStore();
    let hydrated: () => void = () => {};
    const opened = new Promise<void>((resolve) => (hydrated = resolve));
    document.documentElement.classList.remove("dark");
    try {
      const booting = bootApp({
        store,
        controller: controller(),
        open: async () => {
          await opened;
          return { storage, fallback: false };
        },
      });
      await Promise.resolve();
      expect(document.documentElement).not.toHaveClass("dark");
      hydrated();
      const persistence = await booting;
      expect(document.documentElement).not.toHaveClass("dark");
      store.getState().updateSettings({ theme: "dark" });
      expect(document.documentElement).toHaveClass("dark");
      persistence.stop();
      store.getState().updateSettings({ theme: "light" });
      expect(document.documentElement).toHaveClass("dark");
    } finally {
      localStorage.clear();
      document.documentElement.classList.add("dark");
    }
  });

  it("never rejects: a restore that throws still starts the game read, says so, and saves nothing this session", async () => {
    const disk = memoryStorage();
    await disk.set(`${STORAGE_PREFIX}settings`, { theme: "light" });
    const writes: string[] = [];
    const storage: KeyValueStorage = {
      get: (key) => disk.get(key),
      async set(key, value) {
        writes.push(key);
        await disk.set(key, value);
      },
    };
    const store = createAppStore();
    const data = controller();
    let thrown = false;
    const unsubscribe = store.subscribe(() => {
      if (thrown) return;
      thrown = true;
      throw new Error("ouvinte quebrado");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const persistence = await bootApp({ store, controller: data, open: async () => ({ storage, fallback: false }) });
      expect(thrown).toBe(true);
      expect(data.start).toHaveBeenCalledOnce();
      expect(store.getState().ui.notice).toBe(RESTORE_NOTICE);
      expect(error).toHaveBeenCalled();
      store.getState().setMode("percentile");
      store.getState().updateSettings({ pollSeconds: 30, theme: "light" });
      await persistence.flush();
      expect(writes).toEqual([]);
      expect(await disk.get(`${STORAGE_PREFIX}settings`)).toEqual({ theme: "light" });
      expect(document.documentElement).not.toHaveClass("dark");
      expect(localStorage.getItem(THEME_KEY)).toBeNull();
      persistence.stop();
    } finally {
      unsubscribe();
      error.mockRestore();
      document.documentElement.classList.add("dark");
      localStorage.clear();
    }
  });

  it("says when part of the saved state could not be read, and leaves that part on disk", async () => {
    const disk = memoryStorage();
    await disk.set(`${STORAGE_PREFIX}cart`, { items: [{ uid: 7, kind: "buy", fee: 1, wage: 1, name: "Guardado" }] });
    const writes: string[] = [];
    const storage: KeyValueStorage = {
      get: (key) => (key.endsWith("cart") ? Promise.reject(new Error("leitura falhou")) : disk.get(key)),
      async set(key, value) {
        writes.push(key);
        await disk.set(key, value);
      },
    };
    const store = createAppStore();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const persistence = await bootApp({
        store,
        controller: controller(),
        open: async () => ({ storage, fallback: false }),
      });
      expect(store.getState().ui.notice).toBe(UNREADABLE_NOTICE);
      store.getState().addToCart({ uid: 8, kind: "buy", fee: 2, wage: 2, name: "Novo" });
      store.getState().setMode("percentile");
      await persistence.flush();
      expect(writes).toEqual([`${STORAGE_PREFIX}ui`]);
      expect(await disk.get(`${STORAGE_PREFIX}cart`)).toMatchObject({ items: [{ uid: 7, name: "Guardado" }] });
      persistence.stop();
    } finally {
      warn.mockRestore();
      document.documentElement.classList.add("dark");
      localStorage.clear();
    }
  });

  it("shows the read error when starting the game read throws, instead of rejecting", async () => {
    const store = createAppStore();
    const data = controller();
    data.start.mockImplementation(() => {
      throw new Error("leitor indisponível");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const persistence = await bootApp({
        store,
        controller: data,
        open: async () => ({ storage: memoryStorage(), fallback: false }),
      });
      expect(store.getState().data.error).toBe("Não foi possível começar a ler o jogo: leitor indisponível");
      persistence.stop();
    } finally {
      error.mockRestore();
    }
  });

  it("still starts, saving in memory, when opening the storage throws", async () => {
    const store = createAppStore();
    const data = controller();
    const persistence = await bootApp({ store, controller: data, open: () => Promise.reject(new Error("sem disco")) });
    expect(store.getState().ui.notice).toBe(STORAGE_NOTICE);
    expect(data.start).toHaveBeenCalledOnce();
    persistence.stop();
  });
});
