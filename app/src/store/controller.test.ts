import type { Snapshot } from "@/data/types";
import { type EngineClient, SupersededError } from "@/engine/client";
import { engineSlots, shapeFromFormation } from "@/engine/tacticShape";
import { sampleTactic } from "@/engine/testing/tactic";
import { createDataController, type DataControllerDeps } from "./controller";
import { emptyFilters } from "./filters";
import { type AppStore, createAppStore } from "./index";
import { fakeEngine, fakeSource, testSnapshot } from "./testing";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

function setup(overrides: Partial<DataControllerDeps> = {}) {
  const store = createAppStore();
  const fake = fakeSource();
  const engines: ReturnType<typeof fakeEngine>[] = [];
  const createEngine = vi.fn((): EngineClient => {
    const engine = fakeEngine();
    engines.push(engine);
    return engine.client;
  });
  const controller = createDataController({
    source: fake.source,
    store,
    createEngine,
    afterPaint: () => Promise.resolve(),
    ...overrides,
  });
  return { store, fake, engines, createEngine, controller, data: () => store.getState().data };
}

const lastCall = (engines: ReturnType<typeof fakeEngine>[]) => {
  const calls = engines.at(-1)!.calls;
  return calls[calls.length - 1];
};

const poolAt = (store: AppStore, poolMinutes: number) =>
  store.getState().updateSettings({ engine: { ...store.getState().settings.engine, poolMinutes } });

async function loaded(store: AppStore, engines: ReturnType<typeof fakeEngine>[]) {
  await vi.waitFor(() => expect(engines.at(-1)?.calls.length).toBeGreaterThan(0));
  lastCall(engines).resolve();
  await vi.waitFor(() => expect(store.getState().data.analysis).not.toBeNull());
}

describe("data controller", () => {
  it("publishes the snapshot together with its first analysis", async () => {
    const { controller, engines, data } = setup();
    controller.start();
    await vi.waitFor(() => expect(engines[0]?.calls.length).toBe(1));
    expect(data()).toMatchObject({ snapshot: null, analysis: null, loading: true, progress: { phase: "analyze" } });

    engines[0].calls[0].resolve();
    await vi.waitFor(() => expect(data().analysis).not.toBeNull());
    expect(data()).toMatchObject({ loading: false, progress: null, error: null });
    expect(data().snapshot?.my_clubs[0].name).toBe("MFC");
    controller.stop();
  });

  it("stamps the time the players were read, not the time the analysis landed", async () => {
    const { controller, engines, data } = setup();
    const readAt = new Date(2026, 10, 12, 21, 7).getTime();
    vi.spyOn(Date, "now").mockReturnValue(readAt);
    controller.start();
    await vi.waitFor(() => expect(engines[0]?.calls.length).toBe(1));
    expect(data().readAt).toBeNull();

    vi.spyOn(Date, "now").mockReturnValue(readAt + 60_000);
    engines[0].calls[0].resolve();
    await vi.waitFor(() => expect(data().analysis).not.toBeNull());
    expect(data().readAt).toBe(readAt);
    vi.restoreAllMocks();
    controller.stop();
  });

  it("analyses with the store's composites and engine settings, for the human club", async () => {
    const { controller, engines, store } = setup();
    controller.start();
    await vi.waitFor(() => expect(engines[0]?.calls.length).toBe(1));
    const { input } = engines[0].calls[0];
    const state = store.getState();
    expect(input).not.toHaveProperty("universe");
    expect(input.settings).toBe(state.settings.engine);
    expect(input).not.toHaveProperty("performancePresets");
    expect(input.composites.map((c) => c.id)).toEqual(state.composites.actions.map((c) => c.id));
    expect(input.myClubUid).toBe(301344);
    controller.stop();
  });

  it("sends the club's Tactical fit XI, and analyses again when it changes", async () => {
    const { controller, engines, store } = setup();
    store.getState().setFormation(301344, "4-4-2");
    controller.start();
    await vi.waitFor(() => expect(engines[0]?.calls.length).toBe(1));
    expect(engines[0].calls[0].input.lineup).toEqual({
      formation: "4-4-2",
      picks: {},
      roles: shapeFromFormation("4-4-2").map((s) => s.ip.roleId),
    });
    engines[0].calls[0].resolve();
    await vi.waitFor(() => expect(store.getState().data.analysis).not.toBeNull());

    store.getState().editLineup(301344, { base: null, name: null, slots: shapeFromFormation("4-4-2") }, { 10: null });
    await vi.waitFor(() => expect(engines[0].calls.length).toBe(2));
    expect(engines[0].calls[1].input.lineup).toEqual({
      formation: "4-4-2",
      picks: { 10: null },
      slots: engineSlots(shapeFromFormation("4-4-2")),
      roles: shapeFromFormation("4-4-2").map((s) => s.ip.roleId),
    });
    controller.stop();
  });

  it("picking a role re-runs the analysis with it", async () => {
    const { controller, engines, store } = setup();
    controller.start();
    await vi.waitFor(() => expect(engines[0]?.calls.length).toBe(1));
    expect(engines[0].calls[0].input.role).toBeNull();
    engines[0].calls[0].resolve();
    await vi.waitFor(() => expect(store.getState().data.analysis).not.toBeNull());

    store.getState().setRole("ip:29");
    await vi.waitFor(() => expect(engines[0].calls.length).toBe(2));
    expect(engines[0].calls[1].input.role).toBe("ip:29");
    controller.stop();
  });

  it("a game tactic reaches the engine as the lineup's slots", async () => {
    const fake = fakeSource(testSnapshot({ tactic: sampleTactic() }));
    const { controller, engines } = setup({ source: fake.source });
    controller.start();
    await vi.waitFor(() => expect(engines[0]?.calls.length).toBe(1));
    expect(engines[0].calls[0].input.lineup?.slots).toEqual([
      "GK",
      "D(R)",
      "D(C)",
      "D(C)",
      "D(L)",
      "AM(L)",
      "M(C)",
      "M(C)",
      "M(C)",
      "AM(R)",
      "ST(C)",
    ]);
    controller.stop();
  });

  it("the pitch view is a setting", () => {
    const { store } = setup();
    store.getState().setPitchView("ambos");
    expect(store.getState().ui.pitchView).toBe("ambos");
  });

  it("settles the cart against every snapshot it publishes", async () => {
    const { controller, engines, store, fake } = setup();
    const [signed] = (await fake.source.loadPlayers("competitive", false)).players;
    store.getState().addToCart({ uid: signed.uid, kind: "buy", fee: 1, wage: 1, name: signed.name });
    controller.start();
    await vi.waitFor(() => expect(engines[0]?.calls.length).toBe(1));
    expect(store.getState().cart.items[0].status).toBeUndefined();

    engines[0].calls[0].resolve();
    await vi.waitFor(() => expect(store.getState().cart.items[0].status).toBe("contratado"));
    controller.stop();
  });

  it("lets the loading state paint before posting a new snapshot to the engine", async () => {
    const paint = deferred();
    const { controller, engines, data } = setup({ afterPaint: () => paint.promise });
    controller.start();
    await vi.waitFor(() => expect(data().progress).toEqual({ phase: "analyze" }));
    await Promise.resolve();
    expect(engines.length === 0 || engines[0].calls.length === 0).toBe(true);
    expect(data().loading).toBe(true);
    paint.resolve();
    await vi.waitFor(() => expect(engines[0]?.calls.length).toBe(1));
    controller.stop();
  });

  it("does not wait for a paint when only the pool's minutes change", async () => {
    let paints = 0;
    const { controller, engines, store } = setup({ afterPaint: async () => void paints++ });
    controller.start();
    await loaded(store, engines);
    expect(paints).toBe(1);
    poolAt(store, 300);
    await vi.waitFor(() => expect(engines[0].calls.length).toBe(2));
    expect(paints).toBe(1);
    controller.stop();
  });

  it("re-analyses when the pool's minutes change but not when the theme does", async () => {
    const { controller, engines, store } = setup();
    controller.start();
    await loaded(store, engines);
    store.getState().updateSettings({ theme: "light" });
    await Promise.resolve();
    expect(engines[0].calls.length).toBe(1);
    poolAt(store, 300);
    poolAt(store, 450);
    await vi.waitFor(() => expect(engines[0].calls.length).toBe(2));
    expect(engines[0].calls[1].input.settings.poolMinutes).toBe(450);
    controller.stop();
  });

  it("applies a result only when its seq is above the last applied", async () => {
    const { controller, engines, store, data } = setup();
    controller.start();
    await loaded(store, engines);
    poolAt(store, 300);
    await vi.waitFor(() => expect(engines[0].calls.length).toBe(2));
    poolAt(store, 450);
    await vi.waitFor(() => expect(engines[0].calls.length).toBe(3));
    const [, older, newer] = engines[0].calls;
    newer.resolve();
    await vi.waitFor(() => expect(data().analysis?.seq).toBe(newer.seq));
    older.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(data().analysis?.seq).toBe(newer.seq);
    controller.stop();
  });

  it("ignores a superseded analysis", async () => {
    const { controller, engines, store, data } = setup();
    controller.start();
    await loaded(store, engines);
    poolAt(store, 300);
    await vi.waitFor(() => expect(engines[0].calls.length).toBe(2));
    engines[0].calls[1].reject(new SupersededError("a newer analysis replaced this one"));
    await vi.waitFor(() => expect(data().analyzing).toBe(false));
    expect(data().error).toBeNull();
    controller.stop();
  });

  it("recreates the engine once after it fails and runs the analysis again", async () => {
    const { controller, engines, createEngine, store, data } = setup();
    controller.start();
    await vi.waitFor(() => expect(engines[0]?.calls.length).toBe(1));
    engines[0].calls[0].reject(new Error("engine worker failed"));
    await vi.waitFor(() => expect(engines[1]?.calls.length).toBe(1));
    expect(createEngine).toHaveBeenCalledTimes(2);
    expect(engines[0].client.dispose).toHaveBeenCalled();
    engines[1].calls[0].resolve();
    await vi.waitFor(() => expect(data().analysis).not.toBeNull());
    expect(data().error).toBeNull();
    expect(store.getState().data.loading).toBe(false);
    controller.stop();
  });

  it("surfaces the engine error when the recreated engine fails too", async () => {
    const { controller, engines, createEngine, data } = setup();
    controller.start();
    await vi.waitFor(() => expect(engines[0]?.calls.length).toBe(1));
    engines[0].calls[0].reject(new Error("engine worker failed"));
    await vi.waitFor(() => expect(engines[1]?.calls.length).toBe(1));
    engines[1].calls[0].reject(new Error("engine worker failed"));
    await vi.waitFor(() => expect(data().error).toContain("engine worker failed"));
    expect(createEngine).toHaveBeenCalledTimes(2);
    expect(data()).toMatchObject({ loading: false, analyzing: false });
    controller.stop();
  });

  it("clears the engine error once an analysis succeeds again", async () => {
    const { controller, engines, store, data } = setup();
    controller.start();
    await loaded(store, engines);
    poolAt(store, 300);
    await vi.waitFor(() => expect(engines[0].calls.length).toBe(2));
    engines[0].calls[1].reject(new Error('composite "x": the id is already a column'));
    await vi.waitFor(() => expect(engines[1]?.calls.length).toBe(1));
    engines[1].calls[0].reject(new Error('composite "x": the id is already a column'));
    await vi.waitFor(() => expect(data().error).toContain("already a column"));
    poolAt(store, 450);
    await vi.waitFor(() => expect(engines[1].calls.length).toBe(2));
    engines[1].calls[1].resolve();
    await vi.waitFor(() => expect(data().error).toBeNull());
    controller.stop();
  });

  it("keeps a load error through a re-analysis of the data still shown", async () => {
    const { controller, engines, store, fake, data } = setup();
    controller.start();
    await loaded(store, engines);
    fake.source.loadPlayers.mockRejectedValueOnce("FM27 não está aberto");
    await controller.reload();
    poolAt(store, 300);
    await vi.waitFor(() => expect(engines[0].calls.length).toBe(2));
    engines[0].calls[1].resolve();
    await vi.waitFor(() => expect(data().analysis?.seq).toBe(2));
    expect(data().error).toContain("FM27 não está aberto");
    controller.stop();
  });

  it("keeps the previous snapshot and analysis when a reload fails", async () => {
    const { controller, engines, store, fake, data } = setup();
    controller.start();
    await loaded(store, engines);
    const before = data();
    fake.source.loadPlayers.mockRejectedValueOnce("FM27 não está aberto");
    await controller.reload();
    expect(data().snapshot).toBe(before.snapshot);
    expect(data().analysis).toBe(before.analysis);
    expect(data().loading).toBe(false);
    expect(data().error).toContain("FM27 não está aberto");
    controller.stop();
  });

  it("keeps the data on show when a reload reads no players, and says why", async () => {
    const { controller, engines, store, fake, data } = setup();
    controller.start();
    await loaded(store, engines);
    const before = data();
    fake.source.loadPlayers.mockResolvedValueOnce({ ...testSnapshot(), players: [] });
    await controller.reload();
    expect(data().snapshot).toBe(before.snapshot);
    expect(data().analysis).toBe(before.analysis);
    expect(data().loading).toBe(false);
    expect(data().error).toBe(
      "Não foi possível ler os jogadores: o jogo não devolveu nenhum jogador; ele pode estar no menu principal ou carregando um save",
    );
    expect(engines[0].calls).toHaveLength(1);
    expect(fake.source.finances).toHaveBeenCalledTimes(1);
    controller.stop();
  });

  it("reads again with the latest scope when the scope changes while a load runs", async () => {
    const { controller, engines, store, fake } = setup();
    controller.start();
    await loaded(store, engines);
    let answer!: (snapshot: Snapshot) => void;
    fake.source.loadPlayers.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
    const running = controller.reload();
    store.getState().updateSettings({ scope: "league" });
    const league = controller.reload();
    store.getState().updateSettings({ scope: "cups" });
    const cups = controller.reload();
    expect(cups).toBe(league);

    answer(testSnapshot());
    await vi.waitFor(() => expect(engines[0].calls.length).toBe(2));
    engines[0].calls[1].resolve();
    await vi.waitFor(() => expect(engines[0].calls.length).toBe(3));
    engines[0].calls[2].resolve();
    await Promise.all([running, league, cups]);
    expect(fake.source.loadPlayers.mock.calls.map(([scope]) => scope)).toEqual(["competitive", "competitive", "cups"]);
    controller.stop();
  });

  it("drops another club's budgets when the finances of a new save cannot be read", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { controller, engines, store, fake, data } = setup();
    fake.source.finances.mockResolvedValueOnce({
      club_uid: 301344,
      transfer_budget: 1,
      wage_budget_weekly: 2,
      verified: true,
    });
    controller.start();
    await loaded(store, engines);
    await vi.waitFor(() => expect(data().finances?.club_uid).toBe(301344));

    fake.source.finances.mockRejectedValueOnce(new Error("leitor ocupado"));
    fake.source.loadPlayers.mockResolvedValueOnce(testSnapshot({ my_clubs: [{ name: "Outro", uid: 9 }] }));
    const reload = controller.reload();
    await vi.waitFor(() => expect(engines[0].calls.length).toBe(2));
    engines[0].calls[1].resolve();
    await reload;
    await vi.waitFor(() => expect(data().finances).toBeNull());
    controller.stop();
    warn.mockRestore();
  });

  it("keeps the club's budgets when only a later read of them fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { controller, engines, store, fake, data } = setup();
    const finances = { club_uid: 301344, transfer_budget: 1, wage_budget_weekly: 2, verified: true };
    fake.source.finances.mockResolvedValueOnce(finances);
    controller.start();
    await loaded(store, engines);
    await vi.waitFor(() => expect(data().finances).toEqual(finances));

    fake.source.finances.mockRejectedValueOnce(new Error("leitor ocupado"));
    fake.source.loadPlayers.mockResolvedValueOnce(testSnapshot({ date: "2026-11-02" }));
    const reload = controller.reload();
    await vi.waitFor(() => expect(engines[0].calls.length).toBe(2));
    engines[0].calls[1].resolve();
    await reload;
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    expect(data().finances).toEqual(finances);
    controller.stop();
    warn.mockRestore();
  });

  it("keeps the previous rows until the reloaded snapshot is analysed", async () => {
    const { controller, engines, store, fake, data } = setup();
    controller.start();
    await loaded(store, engines);
    const first = data().snapshot;
    const next = testSnapshot({ date: "2026-11-02" });
    fake.source.loadPlayers.mockResolvedValueOnce(next);
    const reload = controller.reload();
    await vi.waitFor(() => expect(engines[0].calls.length).toBe(2));
    expect(data().snapshot).toBe(first);
    expect(data().loading).toBe(true);
    engines[0].calls[1].resolve();
    await reload;
    expect(data().snapshot).toBe(next);
    controller.stop();
  });

  it("shares one load between reloads asked for at the same time", async () => {
    const { controller, engines, store, fake } = setup();
    controller.start();
    await loaded(store, engines);
    const a = controller.reload();
    const b = controller.reload();
    await vi.waitFor(() => expect(engines[0].calls.length).toBe(2));
    engines[0].calls[1].resolve();
    await Promise.all([a, b]);
    expect(fake.source.loadPlayers).toHaveBeenCalledTimes(2);
    controller.stop();
  });

  it("loads the scope from the settings and records the reader's progress", async () => {
    const { controller, store, fake, data } = setup();
    const seen: unknown[] = [];
    store.subscribe((s) => seen.push(s.data.progress));
    fake.source.loadPlayers.mockImplementationOnce(async (_scope, _rescan, onProgress) => {
      onProgress?.({ phase: "read", done: 10, total: 20 });
      return testSnapshot();
    });
    store.getState().updateSettings({ scope: "league" });
    controller.start();
    await vi.waitFor(() => expect(data().progress).toEqual({ phase: "analyze" }));
    expect(fake.source.loadPlayers).toHaveBeenCalledWith("league", false, expect.any(Function));
    expect(seen).toContainEqual({ phase: "read", done: 10, total: 20 });
    controller.stop();
  });

  it("writes the reader's progress once per whole percent, not on every event", async () => {
    const { controller, store, fake, data } = setup();
    const written: unknown[] = [];
    store.subscribe((s, prev) => {
      if (s.data.progress !== prev.data.progress) written.push(s.data.progress);
    });
    fake.source.loadPlayers.mockImplementationOnce(async (_scope, _rescan, onProgress) => {
      onProgress?.({ phase: "scan" });
      onProgress?.({ phase: "scan" });
      for (let done = 0; done <= 46_000; done += 10) onProgress?.({ phase: "read", done, total: 46_000 });
      return testSnapshot();
    });
    controller.start();
    await vi.waitFor(() => expect(data().progress).toEqual({ phase: "analyze" }));
    const reads = written.filter((p) => (p as { phase?: string } | null)?.phase === "read");
    expect(reads.length).toBe(101);
    expect(written.filter((p) => (p as { phase?: string } | null)?.phase === "scan").length).toBe(1);
    controller.stop();
  });

  it("records the game date from the game-date event", async () => {
    const { controller, fake, data } = setup();
    controller.start();
    fake.emitGameDate("2026-11-02");
    expect(data().gameDate).toBe("2026-11-02");
    controller.stop();
    fake.emitGameDate("2026-11-03");
    expect(data().gameDate).toBe("2026-11-02");
  });
});

describe("data controller status polling", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("asks for the status at start and then every pollSeconds", async () => {
    const { controller, fake, store, data } = setup();
    store.getState().updateSettings({ pollSeconds: 10 });
    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(fake.source.status).toHaveBeenCalledTimes(1);
    expect(data().status?.ok).toBe(true);
    await vi.advanceTimersByTimeAsync(9_999);
    expect(fake.source.status).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fake.source.status).toHaveBeenCalledTimes(2);
    controller.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fake.source.status).toHaveBeenCalledTimes(2);
  });

  it("tells the reader and the poll about a new interval", async () => {
    const { controller, fake, store } = setup();
    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(fake.source.setPollSeconds).toHaveBeenLastCalledWith(5);
    store.getState().updateSettings({ pollSeconds: 2 });
    expect(fake.source.setPollSeconds).toHaveBeenLastCalledWith(2);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(fake.source.status).toHaveBeenCalledTimes(2);
    controller.stop();
  });

  it("takes the game date from a status that has one", async () => {
    const { controller, fake, data } = setup();
    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    fake.setStatus({ ok: true, build: "B", build_known: true, date: "2026-11-05" });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(data().gameDate).toBe("2026-11-05");
    controller.stop();
  });

  it("gives up on a status call that hangs and keeps polling", async () => {
    const { controller, fake, data } = setup();
    fake.source.status.mockImplementationOnce(() => new Promise(() => {}));
    controller.start();
    await vi.advanceTimersByTimeAsync(3_999);
    expect(data().status).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(data().status).toMatchObject({ ok: false });
    expect(data().status?.error).toMatch(/não respondeu/);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(fake.source.status).toHaveBeenCalledTimes(2);
    expect(data().status?.ok).toBe(true);
    controller.stop();
  });

  it("never has two status calls out, even when the interval changes mid-call", async () => {
    const { controller, fake, store } = setup();
    let answer!: () => void;
    fake.source.status.mockImplementationOnce(
      () => new Promise((resolve) => (answer = () => resolve({ ok: true, build: "B", build_known: true }))),
    );
    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    store.getState().updateSettings({ pollSeconds: 2 });
    await vi.advanceTimersByTimeAsync(3_000);
    expect(fake.source.status).toHaveBeenCalledTimes(1);
    answer();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(fake.source.status).toHaveBeenCalledTimes(2);
    controller.stop();
  });

  it("turns a failed status call into a not-ok status", async () => {
    const { controller, fake, data } = setup();
    fake.source.status.mockRejectedValueOnce(new Error("sem resposta"));
    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(data().status).toEqual({ ok: false, error: "sem resposta" });
    controller.stop();
  });
});

describe("data controller filters", () => {
  const mask = (...rows: number[]) => Uint8Array.from(rows);

  it("hides rows in the engine and publishes them together with the analysis they filter", async () => {
    const { controller, engines, store, data } = setup();
    store.getState().setFilter("scout", { col: "age", kind: "range", max: 23 });
    controller.start();
    await vi.waitFor(() => expect(engines[0]?.calls.length).toBe(1));
    engines[0].calls[0].resolve();
    await vi.waitFor(() => expect(engines[0].filters.length).toBe(1));
    expect(engines[0].filters[0].filters).toEqual([{ col: "age", kind: "range", max: 23 }]);
    expect(data().analysis).toBeNull();
    engines[0].filters[0].resolve(mask(0));
    await vi.waitFor(() => expect(data().analysis).not.toBeNull());
    expect(data().visible.scout).toEqual(mask(0));
    controller.stop();
  });

  it("publishes one mask per table and re-filters only the table that changed", async () => {
    const { controller, engines, store, data } = setup();
    store.getState().setFilter("scout", { col: "age", kind: "range", max: 23 });
    store.getState().setFilter("elenco", { col: "age", kind: "range", max: 30 });
    store.getState().setFilter("contratacoes", { col: "age", kind: "range", max: 19 });
    controller.start();
    await vi.waitFor(() => expect(engines[0]?.calls.length).toBe(1));
    engines[0].calls[0].resolve();
    await vi.waitFor(() => expect(engines[0].filters.length).toBe(3));
    for (const [k, call] of engines[0].filters.entries()) call.resolve(mask(k));
    await vi.waitFor(() => expect(data().analysis).not.toBeNull());
    const { scout, elenco, contratacoes } = data().visible;
    expect([scout, elenco, contratacoes]).toEqual([mask(0), mask(1), mask(2)]);

    store.getState().setFilter("elenco", { col: "age", kind: "range", max: 25 });
    await vi.waitFor(() => expect(engines[0].filters.length).toBe(4));
    expect(engines[0].filters[3].filters).toEqual([{ col: "age", kind: "range", max: 25 }]);
    engines[0].filters[3].resolve(mask(7));
    await vi.waitFor(() => expect(data().visible.elenco).toEqual(mask(7)));
    expect(data().visible.scout).toBe(scout);
    expect(data().visible.contratacoes).toBe(contratacoes);
    controller.stop();
  });

  it("filters again on a filter change, without analysing again", async () => {
    const { controller, engines, store, data } = setup();
    controller.start();
    await loaded(store, engines);
    expect(data().visible.scout).toBeNull();
    expect(engines[0].filters).toHaveLength(0);
    store.getState().setFilter("scout", { col: "age", kind: "range", max: 23 });
    await vi.waitFor(() => expect(engines[0].filters.length).toBe(1));
    engines[0].filters[0].resolve(mask(0));
    await vi.waitFor(() => expect(data().visible.scout).toEqual(mask(0)));
    store.getState().clearFilters("scout");
    await vi.waitFor(() => expect(data().visible.scout).toBeNull());
    expect(engines[0].calls).toHaveLength(1);
    expect(engines[0].filters).toHaveLength(1);
    controller.stop();
  });

  it("keeps only the newest answer when filters change faster than the engine answers", async () => {
    const { controller, engines, store, data } = setup();
    controller.start();
    await loaded(store, engines);
    store.getState().setFilter("scout", { col: "age", kind: "range", max: 23 });
    await vi.waitFor(() => expect(engines[0].filters.length).toBe(1));
    store.getState().setFilter("scout", { col: "age", kind: "range", max: 21 });
    await vi.waitFor(() => expect(engines[0].filters.length).toBe(2));
    engines[0].filters[1].resolve(mask(1));
    await vi.waitFor(() => expect(data().visible.scout).toEqual(mask(1)));
    engines[0].filters[0].resolve(mask(0));
    await Promise.resolve();
    await Promise.resolve();
    expect(data().visible.scout).toEqual(mask(1));
    controller.stop();
  });

  it("never sends the engine a filter on a column the analysis does not have", async () => {
    const { controller, engines, store, data } = setup();
    controller.start();
    await loaded(store, engines);
    store.setState({ filters: { ...emptyFilters(), scout: [{ col: "apagada", kind: "range", min: 1 }] } });
    await Promise.resolve();
    await Promise.resolve();
    expect(engines[0].filters).toHaveLength(0);
    expect(data().visible.scout).toBeNull();
    controller.stop();
  });

  it("keeps the last mask when the engine answers with one that does not fit, or fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { controller, engines, store, data } = setup();
    controller.start();
    await loaded(store, engines);
    store.getState().setFilter("scout", { col: "age", kind: "range", max: 23 });
    await vi.waitFor(() => expect(engines[0].filters.length).toBe(1));
    engines[0].filters[0].resolve(mask(0));
    await vi.waitFor(() => expect(data().visible.scout).toEqual(mask(0)));

    store.getState().setFilter("scout", { col: "age", kind: "range", max: 21 });
    await vi.waitFor(() => expect(engines[0].filters.length).toBe(2));
    engines[0].filters[1].resolve(mask(1, 0, 1));
    store.getState().setFilter("scout", { col: "age", kind: "range", max: 20 });
    await vi.waitFor(() => expect(engines[0].filters.length).toBe(3));
    engines[0].filters[2].reject(new Error("filter on unknown column"));
    await vi.waitFor(() => expect(warn).toHaveBeenCalledTimes(2));
    expect(data().visible.scout).toEqual(mask(0));
    controller.stop();
    warn.mockRestore();
  });

  it("never keeps the last snapshot's mask for a new one of the same size", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { controller, engines, store, fake, data } = setup();
    store.getState().setFilter("scout", { col: "age", kind: "range", max: 23 });
    controller.start();
    await vi.waitFor(() => expect(engines[0]?.calls.length).toBe(1));
    engines[0].calls[0].resolve();
    await vi.waitFor(() => expect(engines[0].filters.length).toBe(1));
    engines[0].filters[0].resolve(mask(0));
    await vi.waitFor(() => expect(data().visible.scout).toEqual(mask(0)));

    const next = testSnapshot({ date: "2026-11-02" });
    fake.source.loadPlayers.mockResolvedValueOnce(next);
    const reload = controller.reload();
    await vi.waitFor(() => expect(engines[0].calls.length).toBe(2));
    engines[0].calls[1].resolve();
    await vi.waitFor(() => expect(engines[0].filters.length).toBe(2));
    engines[0].filters[1].reject(new Error("filter on unknown column"));
    await reload;
    expect(data().snapshot).toBe(next);
    expect(data().visible.scout).toBeNull();
    controller.stop();
    warn.mockRestore();
  });

  it("filters again once the first analysis lands, when the filters changed while its mask was being made", async () => {
    const { controller, engines, store, data } = setup();
    store.getState().setFilter("scout", { col: "age", kind: "range", max: 23 });
    controller.start();
    await vi.waitFor(() => expect(engines[0]?.calls.length).toBe(1));
    engines[0].calls[0].resolve();
    await vi.waitFor(() => expect(engines[0].filters.length).toBe(1));
    store.getState().setFilter("scout", { col: "age", kind: "range", max: 21 });
    engines[0].filters[0].resolve(mask(0));
    await vi.waitFor(() => expect(engines[0].filters.length).toBe(2));
    expect(engines[0].filters[1].filters).toEqual([{ col: "age", kind: "range", max: 21 }]);
    engines[0].filters[1].resolve(mask(1));
    await vi.waitFor(() => expect(data().visible.scout).toEqual(mask(1)));
    controller.stop();
  });

  it("never asks the engine to filter on a composite the analysis in flight drops", async () => {
    const { controller, engines, store, data } = setup();
    controller.start();
    await vi.waitFor(() => expect(engines[0]?.calls.length).toBe(1));
    engines[0].calls[0].resolve({ composites: { "actions-def": new Float32Array(1) } });
    await vi.waitFor(() => expect(data().analysis).not.toBeNull());
    store.getState().setFilter("scout", { col: "actions-def", kind: "range", min: 3 });
    await vi.waitFor(() => expect(engines[0].filters.length).toBe(1));
    engines[0].filters[0].resolve(mask(1));
    await vi.waitFor(() => expect(data().visible.scout).toEqual(mask(1)));

    store.setState((s) => ({ composites: { ...s.composites, actions: [] } }));
    await vi.waitFor(() => expect(engines[0].calls.length).toBe(2));
    store.getState().setFilter("scout", { col: "age", kind: "range", max: 23 });
    engines[0].calls[1].resolve();
    await vi.waitFor(() => expect(engines[0].filters.length).toBeGreaterThanOrEqual(3));
    for (const call of engines[0].filters.slice(1)) call.resolve(mask(0));
    await vi.waitFor(() => expect(data().visible.scout).toEqual(mask(0)));
    expect(engines[0].filters.slice(1).flatMap((c) => c.filters.map((f) => f.col))).not.toContain("actions-def");
    controller.stop();
  });
});
