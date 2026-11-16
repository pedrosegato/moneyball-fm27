import { isTauri } from "@/data/source";
import { analysisColumnIds } from "@/engine/columnIds";
import { STORAGE_PREFIX, TAURI_STORE_FILE } from "@/lib/storageKeys";
import { restoreCart } from "./cart";
import { restoreColumns } from "./columns";
import { engineComposites, restoreComposites } from "./composites";
import { MAX_FILTERS, restoreFilters } from "./filters";
import { restoreFit } from "./fit";
import type { AppState, AppStore } from "./index";
import { restoreSettings } from "./settings";
import { restoreShortlist } from "./shortlist";
import { restoreUi, savedUi } from "./ui";
import { pinnedFiltersOf } from "./universeMigration";

const WRITE_DELAY_MS = 250;

export interface KeyValueStorage {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

export function browserStorage(storage: Storage = window.localStorage): KeyValueStorage {
  return {
    async get(key) {
      const saved = storage.getItem(key);
      if (saved === null) return undefined;
      try {
        return JSON.parse(saved);
      } catch {
        return undefined;
      }
    },
    async set(key, value) {
      storage.setItem(key, JSON.stringify(value));
    },
  };
}

async function tauriStorage(): Promise<KeyValueStorage> {
  const { getStore } = await import("@tauri-apps/plugin-store");
  const store = await getStore(TAURI_STORE_FILE);
  if (!store) throw new Error(`${TAURI_STORE_FILE} não foi aberto pelo app`);
  return {
    get: (key) => store.get(key),
    async set(key, value) {
      await store.set(key, value);
      await store.save();
    },
  };
}

export function memoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    async get(key) {
      const saved = values.get(key);
      return saved === undefined ? undefined : JSON.parse(saved);
    },
    async set(key, value) {
      values.set(key, JSON.stringify(value));
    },
  };
}

export interface OpenedStorage {
  storage: KeyValueStorage;
  fallback: boolean;
}

export interface StorageOpeners {
  inTauri?: boolean;
  tauri?: () => Promise<KeyValueStorage>;
  browser?: () => KeyValueStorage;
}

export async function openStorage({
  inTauri = isTauri(),
  tauri = tauriStorage,
  browser = () => browserStorage(),
}: StorageOpeners = {}): Promise<OpenedStorage> {
  const openers = inTauri ? [tauri, async () => browser()] : [async () => browser()];
  for (const [k, open] of openers.entries()) {
    try {
      return { storage: await open(), fallback: k > 0 };
    } catch (e) {
      console.warn("Armazenamento das configurações indisponível", e);
    }
  }
  return { storage: memoryStorage(), fallback: true };
}

interface PersistedSlice {
  field: keyof AppState;
  save(state: AppState): unknown;
  restore(raw: unknown, state: AppState): Partial<AppState>;
}

function persisted<K extends keyof AppState>(
  field: K,
  restore: (raw: unknown, state: AppState) => AppState[K],
  save: (value: AppState[K]) => unknown = (value) => value,
): PersistedSlice {
  return { field, save: (state) => save(state[field]), restore: (raw, state) => ({ [field]: restore(raw, state) }) };
}

const PERSISTED: readonly PersistedSlice[] = [
  persisted("settings", restoreSettings),
  persisted("composites", restoreComposites),
  persisted("filters", (raw, s) =>
    restoreFilters(raw, analysisColumnIds(engineComposites(s.composites).map((c) => c.id))),
  ),
  persisted("columns", restoreColumns),
  persisted("cart", restoreCart),
  persisted("shortlist", restoreShortlist),
  persisted("fit", restoreFit),
  persisted("ui", restoreUi, savedUi),
];

const keyOf = (slice: PersistedSlice) => `${STORAGE_PREFIX}${slice.field}`;
const FILTERS_KEY = `${STORAGE_PREFIX}filters`;
const LEGACY_UNIVERSE_KEY = `${STORAGE_PREFIX}universe`;

async function movePinnedFilters(store: AppStore, storage: KeyValueStorage, unreadable: ReadonlySet<keyof AppState>) {
  if (unreadable.has("filters")) return;
  try {
    const saved = await storage.get(LEGACY_UNIVERSE_KEY);
    if (saved === undefined || saved === null) return;
    const { filters } = store.getState();
    const scout = [...filters.scout];
    for (const pin of pinnedFiltersOf(saved)) {
      if (scout.length < MAX_FILTERS && !scout.some((f) => f.col === pin.col)) scout.push(pin);
    }
    const moved = { ...filters, scout };
    store.setState({ filters: moved });
    await storage.set(FILTERS_KEY, moved);
    await storage.set(LEGACY_UNIVERSE_KEY, null);
  } catch (e) {
    console.warn(`Comparação salva não convertida em filtros (${LEGACY_UNIVERSE_KEY})`, e);
  }
}

export async function hydrateStore(store: AppStore, storage: KeyValueStorage): Promise<ReadonlySet<keyof AppState>> {
  const unreadable = new Set<keyof AppState>();
  const saved = await Promise.all(
    PERSISTED.map((slice) =>
      storage.get(keyOf(slice)).catch((e: unknown) => {
        console.warn(`Configuração salva ilegível (${keyOf(slice)}): usando o padrão`, e);
        unreadable.add(slice.field);
        return undefined;
      }),
    ),
  );
  const restored: Partial<AppState> = {};
  PERSISTED.forEach((slice, k) => {
    if (saved[k] === undefined) return;
    try {
      Object.assign(restored, slice.restore(saved[k], { ...store.getState(), ...restored }));
    } catch (e) {
      console.warn(`Configuração salva ilegível (${keyOf(slice)}): usando o padrão`, e);
    }
  });
  store.setState(restored);
  await movePinnedFilters(store, storage, unreadable);
  return unreadable;
}

export interface Persistence {
  flush(): Promise<void>;
  stop(): void;
}

export function persistStore(
  store: AppStore,
  storage: KeyValueStorage,
  unwritable: ReadonlySet<keyof AppState> = new Set(),
): Persistence {
  const writable = PERSISTED.filter((slice) => !unwritable.has(slice.field));
  const dirty = new Set<PersistedSlice>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function flush() {
    clearTimeout(timer);
    timer = undefined;
    const state = store.getState();
    const writes = [...dirty].map((slice) =>
      storage
        .set(keyOf(slice), slice.save(state))
        .catch((e: unknown) => console.warn(`Não foi possível salvar ${keyOf(slice)}`, e)),
    );
    dirty.clear();
    await Promise.all(writes);
  }

  const unsubscribe = store.subscribe((state, prev) => {
    for (const slice of writable) if (state[slice.field] !== prev[slice.field]) dirty.add(slice);
    if (dirty.size && timer === undefined) timer = setTimeout(() => void flush(), WRITE_DELAY_MS);
  });
  const onHide = () => void flush();
  window.addEventListener("pagehide", onHide);

  return {
    flush,
    stop() {
      unsubscribe();
      clearTimeout(timer);
      window.removeEventListener("pagehide", onHide);
    },
  };
}
