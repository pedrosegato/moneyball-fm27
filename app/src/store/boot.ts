import { i18n } from "@/i18n";
import { messageOf } from "@/lib/errors";
import type { DataController } from "./controller";
import type { AppState, AppStore } from "./index";
import {
  hydrateStore,
  type KeyValueStorage,
  memoryStorage,
  type OpenedStorage,
  openStorage,
  type Persistence,
  persistStore,
} from "./persist";
import { syncTheme } from "./theme";

export interface BootDeps {
  store: AppStore;
  controller: DataController;
  open?: () => Promise<OpenedStorage>;
}

function startSaving(store: AppStore, storage: KeyValueStorage, unreadable: ReadonlySet<keyof AppState>): Persistence {
  const stopTheme = syncTheme(store);
  const persistence = persistStore(store, storage, unreadable);
  return {
    flush: persistence.flush,
    stop() {
      persistence.stop();
      stopTheme();
    },
  };
}

function startReading(store: AppStore, controller: DataController) {
  try {
    controller.start();
  } catch (e) {
    console.error("A leitura do jogo não começou", e);
    store.getState().setData({ error: i18n.t("store:error.startReading", { message: messageOf(e) }) });
  }
}

function savingNothing(store: AppStore): Persistence {
  const stopTheme = syncTheme(store, { keepCopy: false });
  return { flush: async () => {}, stop: stopTheme };
}

export async function bootApp({ store, controller, open = openStorage }: BootDeps): Promise<Persistence> {
  try {
    const { storage, fallback } = await open().catch((e: unknown) => {
      console.warn("Armazenamento das configurações indisponível", e);
      return { storage: memoryStorage(), fallback: true };
    });
    if (fallback) store.getState().showNotice(i18n.t("store:notice.storage"));
    let unreadable: ReadonlySet<keyof AppState>;
    try {
      unreadable = await hydrateStore(store, storage);
    } catch (e) {
      console.error("Configurações salvas não restauradas: usando padrões, sem salvar nesta sessão", e);
      store.getState().showNotice(i18n.t("store:notice.restore"));
      return savingNothing(store);
    }
    if (unreadable.size) store.getState().showNotice(i18n.t("store:notice.unreadable"));
    return startSaving(store, storage, unreadable);
  } catch (e) {
    console.error("Configurações indisponíveis nesta sessão", e);
    return { flush: async () => {}, stop() {} };
  } finally {
    startReading(store, controller);
  }
}
