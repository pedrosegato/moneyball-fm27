import type { Snapshot } from "@/data/types";
import { type EngineClient, type SequencedAnalysis, SupersededError } from "@/engine/client";
import { i18n } from "@/i18n";
import { messageOf } from "@/lib/errors";
import { analysisInput, liveCompositeIds } from "./analysisInput";
import { type DataState, noMasks } from "./data";
import { type Masks, maskOf, masksOf } from "./filterMasks";
import { FILTER_TABLES, type FilterTable, perFilterTable, usableFilters } from "./filters";
import type { AppStore } from "./index";
import { periodSnapshot } from "./periodSnapshot";

export interface AnalysisRunnerDeps {
  store: AppStore;
  createEngine(): EngineClient;
  afterPaint(): Promise<void>;
  isRunning(): boolean;
}

export interface AnalysisRunner {
  adopt(snapshot: Snapshot): void;
  analyze(): Promise<void>;
  queue(): void;
  refilter(table: FilterTable): Promise<void>;
  reset(): void;
}

export function createAnalysisRunner({
  store,
  createEngine,
  afterPaint,
  isRunning,
}: AnalysisRunnerDeps): AnalysisRunner {
  let engine: EngineClient | null = null;
  let appliedSeq = 0;
  let posted: Snapshot | null = null;
  let pending: Snapshot | null = null;
  let pendingReadAt: number | null = null;
  let inFlight = 0;
  let retried = false;
  let engineFailed = false;
  let queued = false;
  const filterTickets = perFilterTable(() => 0);

  const state = () => store.getState();
  const setData = (patch: Partial<DataState>) => state().setData(patch);
  const target = () => pending ?? state().data.snapshot;

  function apply(client: EngineClient, snapshot: Snapshot, result: SequencedAnalysis, masks: Masks) {
    if (client !== engine || result.seq <= appliedSeq) return;
    const rows = { visible: { ...state().data.visible, ...masks } };
    if (snapshot === pending) {
      pending = null;
      appliedSeq = result.seq;
      engineFailed = false;
      setData({
        snapshot,
        analysis: result,
        visible: { ...noMasks(), ...masks },
        loading: false,
        progress: null,
        error: null,
        readAt: pendingReadAt,
      });
    } else if (!pending && snapshot === state().data.snapshot) {
      appliedSeq = result.seq;
      setData(engineFailed ? { analysis: result, ...rows, error: null } : { analysis: result, ...rows });
      engineFailed = false;
    }
  }

  async function refilter(table: FilterTable) {
    const { analysis, snapshot } = state().data;
    const client = engine;
    if (!isRunning() || !client || !analysis || !snapshot) return;
    const filters = usableFilters(state().filters[table], liveCompositeIds(state(), analysis));
    const ticket = ++filterTickets[table];
    const visible = filters.length ? await maskOf(client, filters, snapshot.players.length) : null;
    const stale = ticket !== filterTickets[table] || client !== engine || state().data.snapshot !== snapshot;
    if (stale || visible === undefined) return;
    setData({ visible: { ...state().data.visible, [table]: visible } });
  }

  function preparePeriod(snapshot: Snapshot) {
    const { ui, data } = state();
    if (!data.analysis || data.analysis.period === ui.period) return;
    void afterPaint().then(() => periodSnapshot(snapshot, ui.period));
  }

  function fail(error: unknown) {
    const wasLoading = pending !== null;
    pending = null;
    engineFailed = true;
    setData({
      error: i18n.t("store:error.engine", { message: messageOf(error) }),
      ...(wasLoading ? { loading: false, progress: null } : {}),
    });
  }

  async function analyze(): Promise<void> {
    const snapshot = target();
    if (!isRunning() || !snapshot) return;
    inFlight++;
    setData({ analyzing: true });
    try {
      if (snapshot !== posted) {
        await afterPaint();
        if (!isRunning() || snapshot !== target()) return;
        posted = snapshot;
      }
      engine ??= createEngine();
      const client = engine;
      try {
        const asked = client.analyze(analysisInput(state(), snapshot));
        preparePeriod(snapshot);
        const result = await asked;
        const filters = state().filters;
        for (const table of FILTER_TABLES) ++filterTickets[table];
        const players = snapshot.players.length;
        const masks = await masksOf(client, players, filters, Object.keys(result.composites), FILTER_TABLES);
        apply(client, snapshot, result, masks);
        for (const table of FILTER_TABLES) if (state().filters[table] !== filters[table]) void refilter(table);
        retried = false;
      } catch (e) {
        if (e instanceof SupersededError || client !== engine || !isRunning()) return;
        if (!retried) {
          retried = true;
          client.dispose();
          engine = null;
          posted = null;
          appliedSeq = 0;
          return await analyze();
        }
        retried = false;
        fail(e);
      }
    } finally {
      if (--inFlight === 0) setData({ analyzing: false });
    }
  }

  return {
    adopt(snapshot) {
      pending = snapshot;
      pendingReadAt = Date.now();
      setData({ progress: { phase: "analyze" } });
    },
    analyze,
    queue() {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        void analyze();
      });
    },
    refilter,
    reset() {
      engine?.dispose();
      engine = null;
      posted = null;
      pending = null;
      appliedSeq = 0;
    },
  };
}
