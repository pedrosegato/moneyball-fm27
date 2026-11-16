import { myClubUid } from "@/data/myClub";
import type { DataSource } from "@/data/source";
import type { LoadProgress, Scope, Snapshot } from "@/data/types";
import type { EngineClient } from "@/engine/client";
import { i18n } from "@/i18n";
import { messageOf } from "@/lib/errors";
import { analysisInputsChanged } from "./analysisInput";
import { createAnalysisRunner } from "./analysisRunner";
import type { DataState } from "./data";
import { FILTER_TABLES } from "./filters";
import type { AppStore } from "./index";
import { createStatusPoller } from "./statusPoller";

export interface DataControllerDeps {
  source: DataSource;
  store: AppStore;
  createEngine(): EngineClient;
  afterPaint?(): Promise<void>;
}

export interface DataController {
  start(): void;
  stop(): void;
  reload(): Promise<void>;
}

export function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

function progressStep(progress: LoadProgress): string {
  return progress.phase === "read" && progress.total
    ? `read:${Math.floor((100 * (progress.done ?? 0)) / progress.total)}`
    : progress.phase;
}

export function createDataController({
  source,
  store,
  createEngine,
  afterPaint = nextPaint,
}: DataControllerDeps): DataController {
  let running = false;
  let stopping: (() => void)[] = [];
  let loading: Promise<void> | null = null;
  let loadingScope: Scope | null = null;
  let followUp: Promise<void> | null = null;

  const isRunning = () => running;
  const state = () => store.getState();
  const setData = (patch: Partial<DataState>) => state().setData(patch);
  const runner = createAnalysisRunner({ store, createEngine, afterPaint, isRunning });
  const poller = createStatusPoller({ source, store, isRunning });

  function readFinances(snapshot: Snapshot) {
    source.finances().then(
      (finances) => running && setData({ finances }),
      (e: unknown) => {
        console.warn("Verba do clube indisponível", e);
        if (running && state().data.finances?.club_uid !== myClubUid(snapshot)) setData({ finances: null });
      },
    );
  }

  async function adopt(snapshot: Snapshot) {
    if (!running) return;
    if (snapshot.players.length === 0 && state().data.snapshot?.players.length) {
      throw new Error(i18n.t("store:error.noPlayers"));
    }
    runner.adopt(snapshot);
    readFinances(snapshot);
    await runner.analyze();
  }

  async function load(scope: Scope) {
    setData({ loading: true, progress: null, error: null });
    let lastStep: string | null = null;
    try {
      const snapshot = await source.loadPlayers(scope, false, (progress) => {
        const step = progressStep(progress);
        if (!running || step === lastStep) return;
        lastStep = step;
        setData({ progress });
      });
      await adopt(snapshot);
    } catch (e) {
      if (running) {
        setData({
          loading: false,
          progress: null,
          error: i18n.t("store:error.readPlayers", { message: messageOf(e) }),
        });
      }
    }
  }

  function startLoad(): Promise<void> {
    const scope = state().settings.scope;
    loadingScope = scope;
    loading = load(scope).finally(() => {
      loading = null;
      loadingScope = null;
    });
    return loading;
  }

  function reload(): Promise<void> {
    if (followUp) return followUp;
    if (!loading) return startLoad();
    if (state().settings.scope === loadingScope) return loading;
    const next = () => {
      followUp = null;
      return running ? startLoad() : undefined;
    };
    followUp = loading.then(next, next);
    return followUp;
  }

  return {
    start() {
      if (running) return;
      running = true;
      const stopGameDate = source.onGameDate((gameDate) => setData({ gameDate }));
      const stopStore = store.subscribe((s, prev) => {
        if (s.data.snapshot && s.data.snapshot !== prev.data.snapshot)
          s.settleCart(s.data.snapshot, myClubUid(s.data.snapshot));
        if (analysisInputsChanged(s, prev)) runner.queue();
        for (const table of FILTER_TABLES) if (s.filters[table] !== prev.filters[table]) void runner.refilter(table);
        if (s.settings.pollSeconds !== prev.settings.pollSeconds) poller.intervalChanged();
      });
      stopping = [stopGameDate, stopStore, poller.stop];
      poller.start();
      void reload();
    },

    stop() {
      if (!running) return;
      running = false;
      for (const stop of stopping) stop();
      stopping = [];
      runner.reset();
    },

    reload,
  };
}
