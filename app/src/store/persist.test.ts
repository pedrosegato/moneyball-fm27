import { DEFAULT_ENGINE_SETTINGS } from "@/engine/analysis/input";
import { defaultActionsPresets } from "@/engine/composites";
import { shapeFromTactic } from "@/engine/tacticShape";
import { sampleTactic } from "@/engine/testing/tactic";
import { STORAGE_PREFIX } from "@/lib/storageKeys";
import { createAppStore } from "./index";
import {
  browserStorage,
  hydrateStore,
  type KeyValueStorage,
  memoryStorage,
  openStorage,
  persistStore,
} from "./persist";

const pluginStore = vi.hoisted(() => ({ getStore: vi.fn(), load: vi.fn() }));
vi.mock("@tauri-apps/plugin-store", () => pluginStore);

const save = (slice: string, value: unknown) =>
  localStorage.setItem(`${STORAGE_PREFIX}${slice}`, JSON.stringify(value));
const saved = (slice: string) => {
  const text = localStorage.getItem(`${STORAGE_PREFIX}${slice}`);
  return text === null ? undefined : JSON.parse(text);
};

async function hydrated() {
  const store = createAppStore();
  await hydrateStore(store, browserStorage());
  return store.getState();
}

describe("hydrateStore", () => {
  afterEach(() => localStorage.clear());

  it("keeps the defaults when nothing was saved", async () => {
    const fresh = createAppStore().getState();
    const state = await hydrated();
    expect(state.settings).toEqual(fresh.settings);
    expect(state.filters).toEqual({ scout: [], elenco: [], contratacoes: [] });
  });

  it("drops unknown keys and puts defaults back for values of the wrong type", async () => {
    localStorage.setItem(
      `${STORAGE_PREFIX}settings`,
      `{"theme":"light","pollSeconds":"10","currency":"USD","injected":"<script>","scope":"league",
        "engine":{"poolMinutes":450,"moneyball":{"minRatio":3,"minPerf":"x","excludeClubUid":5},
          "fit":{"lvl":6,"leagueFilter":{"kind":"league","key":"BRA1"}},
          "leagueWeights":{"Série B":0.8,"Ruim":-1,"__proto__":3}}}`,
    );
    const { settings } = await hydrated();
    expect(settings.theme).toBe("light");
    expect(settings.scope).toBe("league");
    expect(settings.pollSeconds).toBe(5);
    expect(settings).not.toHaveProperty("currency");
    expect(settings).not.toHaveProperty("injected");
    expect(settings.engine.poolMinutes).toBe(450);
    expect(settings.engine.moneyball).toEqual({ ...DEFAULT_ENGINE_SETTINGS.moneyball, minRatio: 3 });
    expect(settings.engine.fit).toEqual({
      ...DEFAULT_ENGINE_SETTINGS.fit,
      lvl: 6,
      leagueFilter: { kind: "league", key: "BRA1" },
    });
    expect(Object.entries(settings.engine.leagueWeights)).toEqual([["Série B", 0.8]]);
    expect(Object.getPrototypeOf(settings.engine.leagueWeights)).toBe(Object.prototype);
  });

  it("ignores the currency and rates saved before money followed the game", async () => {
    save("settings", { theme: "light", currency: "BRL", rates: { BRL: 5, EUR: 1.2 } });
    const { settings } = await hydrated();
    expect(settings.theme).toBe("light");
    expect(settings).not.toHaveProperty("currency");
    expect(settings).not.toHaveProperty("rates");
  });

  it("rejects a poll interval outside what the reader accepts", async () => {
    save("settings", { pollSeconds: 1 });
    expect((await hydrated()).settings.pollSeconds).toBe(5);
    save("settings", { pollSeconds: 30 });
    expect((await hydrated()).settings.pollSeconds).toBe(30);
  });

  it("restores the league weight on its steps only, and defaults it for a save made before it existed", async () => {
    save("settings", { engine: { poolMinutes: 450 } });
    expect((await hydrated()).settings.engine.leagueAdjustment).toBe(1);
    for (const [saved, restored] of [
      [0, 0],
      [2.5, 2.5],
      [3, 3],
      [0.3, 1],
      [3.5, 1],
      [-1, 1],
      ["2", 1],
    ] as const) {
      save("settings", { engine: { leagueAdjustment: saved } });
      expect((await hydrated()).settings.engine.leagueAdjustment, String(saved)).toBe(restored);
    }
  });

  it("restores an engine option only within the range its editor allows", async () => {
    const d = DEFAULT_ENGINE_SETTINGS;
    save("settings", { engine: { poolMinutes: 0 } });
    expect((await hydrated()).settings.engine.poolMinutes).toBe(d.poolMinutes);
    save("settings", { engine: { poolMinutes: -300 } });
    expect((await hydrated()).settings.engine.poolMinutes).toBe(d.poolMinutes);
    save("settings", { engine: { poolMinutes: 1 } });
    expect((await hydrated()).settings.engine.poolMinutes).toBe(1);

    save("settings", {
      engine: {
        moneyball: { minPerf: 101, minRatio: -1 },
        sellKeep: { youngAge: 61, contractMonths: 241, devVsAge: -5 },
        fit: { lvl: 31, styleMin: 150 },
      },
    });
    const { engine } = (await hydrated()).settings;
    expect(engine.moneyball).toEqual(d.moneyball);
    expect(engine.sellKeep).toEqual(d.sellKeep);
    expect(engine.fit).toEqual(d.fit);

    save("settings", {
      engine: { moneyball: { minPerf: 0 }, sellKeep: { contractMonths: 0 }, fit: { lvl: 30, styleMin: 100 } },
    });
    const edge = (await hydrated()).settings.engine;
    expect([edge.moneyball.minPerf, edge.sellKeep.contractMonths, edge.fit.lvl, edge.fit.styleMin]).toEqual([
      0, 0, 30, 100,
    ]);
  });

  it("restores a saved filter list as the Scout's", async () => {
    const age = { col: "age", kind: "range", max: 23 };
    save("filters", [age]);
    expect((await hydrated()).filters).toEqual({ scout: [age], elenco: [], contratacoes: [] });
  });

  it("restores a saved record per table, with the rules of a list", async () => {
    const age = { col: "age", kind: "range", max: 23 };
    save("filters", {
      scout: [age, age, { col: "Gols/90", kind: "range", min: 1 }],
      elenco: "junk",
      contratacoes: Array.from({ length: 70 }, (_, k) => ({
        col: k === 0 ? "age" : `Gols/${k}`,
        kind: "range",
        min: 1,
      })),
      other: [age],
    });
    const { filters } = await hydrated();
    expect(filters.scout).toEqual([age]);
    expect(filters.elenco).toEqual([]);
    expect(filters.contratacoes).toEqual([{ col: "age", kind: "range", min: 1 }]);
  });

  it("drops filters on columns the catalog no longer has", async () => {
    save("filters", [
      { col: "age", kind: "range", max: 23 },
      { col: "Gols/90", kind: "range", min: 1 },
      { col: "pct:G/90", kind: "range", min: 90 },
      { col: "actions-def", kind: "range", min: 1 },
      "junk",
    ]);
    expect((await hydrated()).filters.scout).toEqual([
      { col: "age", kind: "range", max: 23 },
      { col: "pct:G/90", kind: "range", min: 90 },
      { col: "actions-def", kind: "range", min: 1 },
    ]);
  });

  it("turns the pins of a saved comparison into the Scout's filters once, keeping the Scout's own on the same column", async () => {
    save("filters", { scout: [{ col: "age", kind: "range", min: 20 }], elenco: [], contratacoes: [] });
    save("universe", {
      group: "ATA",
      minMinutes: 600,
      maxMinutes: 2400,
      leagues: ["Série B", 4],
      pinned: [
        { col: "age", kind: "range", max: 23 },
        { col: "perf", kind: "range", min: 60 },
      ],
    });
    const moved = [
      { col: "age", kind: "range", min: 20 },
      { col: "division", kind: "set", values: ["Série B"] },
      { col: "minutes", kind: "range", min: 600, max: 2400 },
    ];
    const state = await hydrated();
    expect(state.filters.scout).toEqual(moved);
    expect(state).not.toHaveProperty("universe");
    expect(saved("filters").scout).toEqual(moved);
    expect(saved("universe")).toBeNull();

    save("filters", { scout: [], elenco: [], contratacoes: [] });
    expect((await hydrated()).filters.scout).toEqual([]);
  });

  it("leaves a saved comparison on disk when the filters could not be read, to move it on a later start", async () => {
    save("universe", { group: "ATA", minMinutes: 600, pinned: [] });
    const browser = browserStorage();
    const writes: string[] = [];
    const flaky: KeyValueStorage = {
      get: (key) => (key.endsWith("filters") ? Promise.reject(new Error("disco")) : browser.get(key)),
      async set(key, value) {
        writes.push(key);
        await browser.set(key, value);
      },
    };
    const store = createAppStore();
    expect([...(await hydrateStore(store, flaky))]).toEqual(["filters"]);
    expect(store.getState().filters.scout).toEqual([]);
    expect(writes).toEqual([]);
    expect(saved("universe")).toEqual({ group: "ATA", minMinutes: 600, pinned: [] });
  });

  it("restores composite weights and drops custom composites that would collide with a column", async () => {
    save("composites", {
      custom: [
        {
          id: "meu",
          label: "Meu índice",
          kind: "weightedSum",
          weights: { "G/90": 2, "Ast/90": 1, "KP/90": 1, "Nope/90": 3 },
        },
        { id: "G/90", label: "Colide", kind: "weightedSum", weights: { "G/90": 1 } },
        { id: "meu", label: "Repetido", kind: "weightedSum", weights: { "G/90": 1 } },
        { id: "vazio", label: "Sem pesos", kind: "percentileMean", weights: { "G/90": 0 } },
      ],
      performance: { ATA: { weights: { "G/90": 5 } }, PONTA: { weights: { "G/90": 5 } } },
      actions: [
        { id: "actions-def", weights: { "Int/90": 4, "Int/90 ": 9 } },
        { id: "outra", weights: { "G/90": 1 } },
      ],
    });
    const { composites } = await hydrated();
    expect(composites.custom).toEqual([
      { id: "meu", label: "Meu índice", kind: "weightedSum", weights: { "G/90": 2, "Ast/90": 1, "KP/90": 1 } },
    ]);
    expect(composites).not.toHaveProperty("performance");
    const actions = defaultActionsPresets();
    expect(composites.actions).toEqual(
      actions.map((c) => (c.id === "actions-def" ? { ...c, weights: { "Int/90": 4 } } : c)),
    );
  });

  it("drops malformed cart items and keeps one per player and kind", async () => {
    save("cart", {
      items: [
        { uid: 10, kind: "buy", fee: 2_000_000, wage: 15_000, name: "Matheus Ribeiro" },
        { uid: 10, kind: "buy", fee: 1, wage: 1, name: "Duplicado" },
        { uid: 11, kind: "loan", fee: 0, wage: 0, name: "Tipo errado" },
        { uid: -3, kind: "sell", fee: 0, wage: 0, name: "UID inválido" },
        { uid: 12, kind: "sell", fee: Number.MAX_VALUE, wage: 9000, name: "Venda" },
      ],
      budgets: { "301344": { transfer: 24_000_000, wageWeekly: null }, abc: { transfer: 1 } },
    });
    const { cart } = await hydrated();
    expect(cart.items).toEqual([
      { uid: 10, kind: "buy", fee: 2_000_000, wage: 15_000, name: "Matheus Ribeiro" },
      { uid: 12, kind: "sell", fee: Number.MAX_VALUE, wage: 9000, name: "Venda" },
    ]);
    expect(cart.budgets).toEqual({ "301344": { transfer: 24_000_000, wageWeekly: null } });
  });

  it("restores the moves the game settled and the targets of signings, nothing else", async () => {
    save("cart", {
      items: [
        { uid: 10, kind: "buy", fee: 1, wage: 1, name: "Contratado", status: "contratado", settledFor: 301344 },
        { uid: 11, kind: "sell", fee: 1, wage: 1, name: "Vendido", status: "vendido", settledFor: 301344 },
        { uid: 14, kind: "buy", fee: 1, wage: 1, name: "Sem clube", status: "contratado" },
        { uid: 12, kind: "buy", fee: 1, wage: 1, name: "Sumiu", status: "indisponível" },
        { uid: 13, kind: "buy", fee: 1, wage: 1, name: "Estranho", status: "<b>" },
      ],
      targets: { "301344": 5, "42": 0, "43": 2.5, "44": 1000, "45": -1, abc: 3 },
    });
    const { cart } = await hydrated();
    expect(cart.items.map((i) => [i.uid, i.status, i.settledFor])).toEqual([
      [10, "contratado", 301344],
      [11, "vendido", 301344],
      [14, undefined, undefined],
      [12, undefined, undefined],
      [13, undefined, undefined],
    ]);
    expect(cart.targets).toEqual({ "301344": 5, "42": 0 });
  });

  it("keeps only league weights the editor could have made (×0,5 to ×2)", async () => {
    save("settings", {
      engine: {
        leagueWeights: {
          "premier league": 1.2,
          eredivisie: 0.5,
          "liga zero": 0,
          "liga cem": 100,
          "serie a": 2.01,
          x: "1",
        },
      },
    });
    const { settings } = await hydrated();
    expect(settings.engine.leagueWeights).toEqual({ "premier league": 1.2, eredivisie: 0.5 });
  });

  it("restores each club's lineup, dropping unknown formations, slots and picks", async () => {
    save("fit", {
      lineups: {
        "301344": {
          formation: "4-4-2",
          picks: { "0": 12, "3": null, "11": 5, x: 1, "2": -4, "4": "a" },
        },
        "77": { formation: "9-0-1", picks: [] },
        abc: { formation: "4-3-3" },
      },
    });
    const { fit } = await hydrated();
    expect(fit.lineups).toEqual({
      "301344": { formation: "4-4-2", picks: { "0": 12, "3": null } },
      "77": { formation: "4-3-3", picks: {} },
    });
  });

  it("restores an edited shape", async () => {
    const lineup = {
      formation: "4-3-3",
      picks: { "0": 1, "10": 11 },
      shape: { base: "k", name: "4-3-3 Com Extremos", slots: shapeFromTactic(sampleTactic()) },
    };
    save("fit", { lineups: { "301344": lineup } });
    expect((await hydrated()).fit.lineups).toEqual({ "301344": lineup });
  });

  it("drops a saved shape it can't draw", async () => {
    const good = shapeFromTactic(sampleTactic())!;
    const twice = good.map((s, k) => (k === 2 ? { ...s, ip: { ...good[1].ip } } : s));
    const unknownRole = good.map((s, k) => (k === 2 ? { ...s, ip: { ...s.ip, roleId: "ip:20" } } : s));
    const shapes = [
      { base: "k", name: "n", slots: twice },
      { base: "k", name: "n", slots: unknownRole },
      { base: "k", name: "n", slots: good.slice(0, 10) },
      { base: 7, name: "n", slots: good },
    ];
    for (const shape of shapes) {
      save("fit", { lineups: { "301344": { formation: "4-3-3", picks: { "1": 4 }, shape } } });
      expect((await hydrated()).fit.lineups).toEqual({ "301344": { formation: "4-3-3", picks: { "1": 4 } } });
    }
  });

  it("restores the pitch view and drops an unknown one", async () => {
    save("ui", { pitchView: "semPosse" });
    expect((await hydrated()).ui.pitchView).toBe("semPosse");
    save("ui", { pitchView: "x" });
    expect((await hydrated()).ui.pitchView).toBe("comPosse");
  });

  it("ignores a saved left-footed flag", async () => {
    save("fit", { lineups: { "301344": { formation: "4-3-3", picks: { "2": 7 }, leftFooted: { "3": true } } } });
    const { fit } = await hydrated();
    expect(fit.lineups).toEqual({ "301344": { formation: "4-3-3", picks: { "2": 7 } } });
  });

  it("restores shortlist folders with valid player ids only", async () => {
    save("shortlist", { folders: [{ id: "alvos", name: "Alvos", uids: [1, 2, "3", 2, 1.5] }, { id: 4 }] });
    expect((await hydrated()).shortlist.folders).toEqual([{ id: "alvos", name: "Alvos", uids: [1, 2] }]);
  });

  it("restores column presets per position group and every valid column group, in chip order", async () => {
    save("columns", {
      presets: { ATA: ["npxG/90", "npxG/90", 7, "Drb/90"], PONTA: ["x"] },
      groups: ["passe", "nada", "gols", "passe", 3],
    });
    const { columns } = await hydrated();
    expect(columns.presets).toEqual({ ATA: ["npxG/90", "Drb/90"] });
    expect(columns.groups).toEqual(["gols", "passe"]);
  });

  it("restores the picked role and drops an unknown one", async () => {
    save("ui", { role: "ip:29" });
    expect((await hydrated()).ui.role).toBe("ip:29");
    save("ui", { role: "ip:20" });
    expect((await hydrated()).ui.role).toBeNull();
  });

  it("keeps one Performance column where a saved layout had Performance, Perf. função or a group's Performance, once", async () => {
    save("columns", {
      presets: {
        ZAG: ["Int/90", "perf-ZAG", "rolePerf", "Pas%"],
        ALL: ["G/90", "perf", "rolePerf"],
        MC: ["rolePerf", "Pas%"],
        ATA: ["G/90", "Drb/90"],
      },
      groups: [],
      layoutVersion: 2,
    });
    const first = await hydrated();
    expect(first.columns.presets).toEqual({
      ZAG: ["Int/90", "perf", "perfRole", "Pas%"],
      ALL: ["G/90", "perf", "perfRole"],
      MC: ["perf", "perfRole", "Pas%"],
      ATA: ["G/90", "Drb/90"],
    });
    save("columns", first.columns);
    expect((await hydrated()).columns.presets).toEqual(first.columns.presets);
  });

  it("keeps Performance hidden in a layout saved after the migration", async () => {
    save("columns", { presets: { ALL: ["G/90", "perf"] }, groups: [] });
    const migrated = await hydrated();
    save("columns", { ...migrated.columns, presets: { ALL: ["G/90"] } });
    expect((await hydrated()).columns.presets).toEqual({ ALL: ["G/90"] });
  });

  it("restores no column group, so Geral, from an empty or broken save", async () => {
    for (const groups of [[], null, "gols", { 0: "gols" }]) {
      save("columns", { presets: {}, groups });
      expect((await hydrated()).columns.groups).toEqual([]);
    }
  });

  it("restores the value mode but not the selected player", async () => {
    save("ui", { mode: "percentile", selectedUid: 9 });
    expect((await hydrated()).ui).toMatchObject({ mode: "percentile", selectedUid: null, notice: null });
  });

  it("survives text that is not JSON", async () => {
    localStorage.setItem(`${STORAGE_PREFIX}cart`, "{not json");
    expect((await hydrated()).cart.items).toEqual([]);
  });

  it("restores the other slices when one of them throws on the way back", async () => {
    save("filters", [{ col: "age", kind: "range", max: 23 }]);
    const browser = browserStorage();
    const odd: KeyValueStorage = {
      async get(key) {
        if (!key.endsWith("settings")) return browser.get(key);
        return {
          get theme(): string {
            throw new Error("valor estranho");
          },
        };
      },
      set: async () => {},
    };
    const store = createAppStore();
    await hydrateStore(store, odd);
    expect(store.getState().settings).toEqual(createAppStore().getState().settings);
    expect(store.getState().filters.scout).toEqual([{ col: "age", kind: "range", max: 23 }]);
  });

  it("keeps the defaults when the storage cannot be read, and names every slice it could not read", async () => {
    const broken: KeyValueStorage = { get: () => Promise.reject(new Error("disco")), set: async () => {} };
    const store = createAppStore();
    const unreadable = await hydrateStore(store, broken);
    expect([...unreadable].sort()).toEqual([
      "cart",
      "columns",
      "composites",
      "filters",
      "fit",
      "settings",
      "shortlist",
      "ui",
    ]);
    expect(store.getState().settings.theme).toBe("dark");
  });
});

describe("persistStore", () => {
  afterEach(() => localStorage.clear());

  it("writes only the slices that changed, under moneyball-fm27:v1:*", async () => {
    const store = createAppStore();
    const persisted = persistStore(store, browserStorage());
    store.getState().updateSettings({ theme: "light" });
    store.getState().setMode("percentile");
    store.getState().selectPlayer(42);
    await persisted.flush();
    persisted.stop();
    expect(saved("settings").theme).toBe("light");
    expect(saved("ui")).toEqual({
      mode: "percentile",
      moneyball: false,
      signingsMoneyball: false,
      sidebarCollapsed: false,
      role: null,
      pitchView: "comPosse",
      period: "season",
    });
    expect(saved("cart")).toBeUndefined();
    expect(Object.keys(localStorage).every((k) => k.startsWith(STORAGE_PREFIX))).toBe(true);
  });

  it("never writes a slice whose saved value could not be read, and still saves the others", async () => {
    const disk = memoryStorage();
    await disk.set(`${STORAGE_PREFIX}cart`, { items: [{ uid: 7, kind: "buy", fee: 1, wage: 1, name: "Guardado" }] });
    const writes: string[] = [];
    const flaky: KeyValueStorage = {
      get: (key) => (key.endsWith("cart") ? Promise.reject(new Error("leitura falhou")) : disk.get(key)),
      async set(key, value) {
        writes.push(key);
        await disk.set(key, value);
      },
    };
    const store = createAppStore();
    const unreadable = await hydrateStore(store, flaky);
    expect([...unreadable]).toEqual(["cart"]);

    const persisted = persistStore(store, flaky, unreadable);
    store.getState().addToCart({ uid: 8, kind: "buy", fee: 2, wage: 2, name: "Novo" });
    store.getState().updateSettings({ theme: "light" });
    await persisted.flush();
    persisted.stop();
    expect(writes).toEqual([`${STORAGE_PREFIX}settings`]);
    expect(await disk.get(`${STORAGE_PREFIX}cart`)).toMatchObject({ items: [{ uid: 7, name: "Guardado" }] });
  });

  it("replaces a saved slice that was read but could not be used, on its next change", async () => {
    const writes: string[] = [];
    const odd: KeyValueStorage = {
      async get(key) {
        if (!key.endsWith("settings")) return undefined;
        return {
          get theme(): string {
            throw new Error("valor estranho");
          },
        };
      },
      async set(key) {
        writes.push(key);
      },
    };
    const store = createAppStore();
    const unreadable = await hydrateStore(store, odd);
    expect(unreadable.size).toBe(0);

    const persisted = persistStore(store, odd, unreadable);
    store.getState().updateSettings({ theme: "light" });
    await persisted.flush();
    persisted.stop();
    expect(writes).toEqual([`${STORAGE_PREFIX}settings`]);
  });

  it("round-trips through hydrateStore", async () => {
    const store = createAppStore();
    const persisted = persistStore(store, browserStorage());
    const state = store.getState();
    state.setFilter("scout", { col: "age", kind: "range", max: 23 });
    state.addToCart({ uid: 7, kind: "buy", fee: 1_000_000, wage: 5_000, name: "Alvo" });
    state.toggleShortlist(7);
    state.setColumnPreset("ATA", ["npxG/90"]);
    state.updateSettings({ pollSeconds: 10 });
    await persisted.flush();
    persisted.stop();

    const restored = createAppStore();
    await hydrateStore(restored, browserStorage());
    const before = store.getState();
    const after = restored.getState();
    for (const key of ["settings", "filters", "columns", "cart", "shortlist", "composites"] as const) {
      expect(after[key], key).toEqual(before[key]);
    }
  });

  it("writes after a short delay without an explicit flush", async () => {
    vi.useFakeTimers();
    try {
      const store = createAppStore();
      const persisted = persistStore(store, browserStorage());
      store.getState().setFilter("scout", { col: "age", kind: "range", max: 23 });
      expect(saved("filters")).toBeUndefined();
      await vi.advanceTimersByTimeAsync(1000);
      expect(saved("filters")).toEqual({
        scout: [{ col: "age", kind: "range", max: 23 }],
        elenco: [],
        contratacoes: [],
      });
      persisted.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("openStorage", () => {
  afterEach(() => localStorage.clear());

  const refuse = () => Promise.reject(new Error("moneyball-fm27.json corrompido"));
  const throwing = (): KeyValueStorage => {
    throw new DOMException("bloqueado", "SecurityError");
  };

  it("uses the app's store file in Tauri and the browser's storage outside it", async () => {
    const file = memoryStorage();
    expect(await openStorage({ inTauri: true, tauri: async () => file })).toEqual({ storage: file, fallback: false });
    const opened = await openStorage({ inTauri: false });
    expect(opened.fallback).toBe(false);
    await opened.storage.set(`${STORAGE_PREFIX}ui`, { mode: "percentile" });
    expect(saved("ui")).toEqual({ mode: "percentile" });
  });

  it("falls back to the browser's storage when the store file will not open", async () => {
    const opened = await openStorage({ inTauri: true, tauri: refuse });
    expect(opened.fallback).toBe(true);
    await opened.storage.set(`${STORAGE_PREFIX}ui`, { mode: "percentile" });
    expect(saved("ui")).toEqual({ mode: "percentile" });
  });

  describe("the app's settings store in Tauri", () => {
    beforeEach(() => {
      pluginStore.getStore.mockReset();
      pluginStore.load.mockReset();
    });

    it("falls back to localStorage when the app did not open the settings store, and never opens one itself", async () => {
      pluginStore.getStore.mockResolvedValue(null);
      pluginStore.load.mockResolvedValue({ get: async () => undefined, set: async () => {}, save: async () => {} });
      const browser = browserStorage(window.localStorage);
      const opened = await openStorage({ inTauri: true, browser: () => browser });
      expect(opened).toEqual({ storage: browser, fallback: true });
      expect(pluginStore.getStore).toHaveBeenCalledWith("moneyball-fm27.json");
      expect(pluginStore.load).not.toHaveBeenCalled();
    });

    it("reads and writes through the store the app opened, saving each write", async () => {
      const values = new Map<string, unknown>();
      const file = {
        get: vi.fn(async (key: string) => values.get(key)),
        set: vi.fn(async (key: string, value: unknown) => void values.set(key, value)),
        save: vi.fn(async () => {}),
      };
      pluginStore.getStore.mockResolvedValue(file);
      const opened = await openStorage({ inTauri: true });
      expect(opened.fallback).toBe(false);
      await opened.storage.set(`${STORAGE_PREFIX}ui`, { mode: "percentile" });
      expect(await opened.storage.get(`${STORAGE_PREFIX}ui`)).toEqual({ mode: "percentile" });
      expect(file.save).toHaveBeenCalledOnce();
      expect(pluginStore.load).not.toHaveBeenCalled();
    });
  });

  it("falls back to memory when no storage opens, so the session still works", async () => {
    const opened = await openStorage({ inTauri: true, tauri: refuse, browser: throwing });
    expect(opened.fallback).toBe(true);
    await opened.storage.set("k", { a: 1 });
    expect(await opened.storage.get("k")).toEqual({ a: 1 });
    expect(await opened.storage.get("nada")).toBeUndefined();
  });
});
