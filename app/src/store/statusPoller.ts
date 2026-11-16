import type { DataSource } from "@/data/source";
import type { GameStatus } from "@/data/types";
import { i18n } from "@/i18n";
import { messageOf } from "@/lib/errors";
import type { AppStore } from "./index";

const STATUS_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, expired]).finally(() => clearTimeout(timer));
}

export interface StatusPollerDeps {
  source: DataSource;
  store: AppStore;
  isRunning(): boolean;
}

export interface StatusPoller {
  start(): void;
  intervalChanged(): void;
  stop(): void;
}

export function createStatusPoller({ source, store, isRunning }: StatusPollerDeps): StatusPoller {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let asking = false;
  const pollSeconds = () => store.getState().settings.pollSeconds;

  async function poll() {
    if (asking) return;
    asking = true;
    let status: GameStatus;
    try {
      status = await withTimeout(source.status(), STATUS_TIMEOUT_MS, i18n.t("store:error.statusTimeout"));
    } catch (e) {
      status = { ok: false, error: messageOf(e) };
    } finally {
      asking = false;
    }
    if (!isRunning()) return;
    store.getState().setData(status.date ? { status, gameDate: status.date } : { status });
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => void poll(), pollSeconds() * 1000);
  }

  function sendPollSeconds() {
    source.setPollSeconds(pollSeconds()).catch((e: unknown) => console.warn("Intervalo de checagem recusado", e));
  }

  return {
    start() {
      sendPollSeconds();
      void poll();
    },
    intervalChanged() {
      sendPollSeconds();
      schedule();
    },
    stop: () => clearTimeout(timer),
  };
}
