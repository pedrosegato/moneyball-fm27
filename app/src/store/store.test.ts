import type { Tactic } from "@/data/types";
import { moveSlot, shapeFromFormation, shapeFromTactic, tacticKey } from "@/engine/tacticShape";
import { playerRecord, snapshotOf } from "@/engine/testing/records";
import { sampleTactic } from "@/engine/testing/tactic";
import type { FilterSpec } from "@/engine/universe";
import { usableFilters } from "./filters";
import { effectiveLineup, lineupFor, lineupOf } from "./fit";
import { createAppStore, gameTacticOf } from "./index";
import { MAX_COMPARE, restoreUi, savedUi } from "./ui";

describe("store slices", () => {
  it("setFilter replaces the filter on the same column", () => {
    const store = createAppStore();
    store.getState().setFilter("scout", { col: "age", kind: "range", max: 23 });
    store.getState().setFilter("scout", { col: "value", kind: "range", max: 8_000_000 });
    store.getState().setFilter("scout", { col: "age", kind: "range", max: 21 });
    expect(store.getState().filters.scout).toEqual([
      { col: "age", kind: "range", max: 21 },
      { col: "value", kind: "range", max: 8_000_000 },
    ]);
    store.getState().removeFilter("scout", "age");
    expect(store.getState().filters.scout.map((f) => f.col)).toEqual(["value"]);
    store.getState().clearFilters("scout");
    expect(store.getState().filters.scout).toEqual([]);
  });

  it("keeps a filter list per table", () => {
    const store = createAppStore();
    store.getState().setFilter("contratacoes", { col: "age", kind: "range", max: 23 });
    expect(store.getState().filters.scout).toEqual([]);
    expect(store.getState().filters.elenco).toEqual([]);
    store.getState().setFilter("scout", { col: "value", kind: "range", max: 8_000_000 });
    store.getState().clearFilters("scout");
    expect(store.getState().filters.scout).toEqual([]);
    expect(store.getState().filters.contratacoes).toEqual([{ col: "age", kind: "range", max: 23 }]);
  });

  it("the Scout lists the whole save until the Moneyball chip narrows it to the undervalued list", () => {
    const store = createAppStore();
    expect(store.getState().ui).toMatchObject({ moneyball: false });
    expect(store.getState().ui).not.toHaveProperty("onlyCompared");
    store.getState().setMoneyball(true);
    expect(store.getState().ui).toMatchObject({ moneyball: true });
  });

  it("saves the Contratações Moneyball chip apart from the Scout's", () => {
    const store = createAppStore();
    expect(store.getState().ui.signingsMoneyball).toBe(false);
    store.getState().setSigningsMoneyball(true);
    expect(store.getState().ui).toMatchObject({ moneyball: false, signingsMoneyball: true });
    const saved = savedUi(store.getState().ui);
    expect(saved).toMatchObject({ moneyball: false, signingsMoneyball: true });
    expect(restoreUi(saved)).toMatchObject({ moneyball: false, signingsMoneyball: true });
    expect(restoreUi({ signingsMoneyball: "sim" }).signingsMoneyball).toBe(false);
  });

  it("the search is not saved: each table keeps its own for the session", () => {
    const store = createAppStore();
    store.getState().setSearch("scout", "Negueba");
    store.getState().setSearch("elenco", "Hulk");
    expect(store.getState().ui.searches).toEqual({ scout: "Negueba", elenco: "Hulk" });
    expect(savedUi(store.getState().ui)).toEqual({
      mode: "value",
      moneyball: false,
      signingsMoneyball: false,
      sidebarCollapsed: false,
      role: null,
      pitchView: "comPosse",
      period: "season",
    });
    expect(restoreUi(savedUi(store.getState().ui)).searches).toEqual({});
  });

  it("keeps the sidebar collapsed or expanded across sessions, expanded when nothing usable was saved", () => {
    const store = createAppStore();
    expect(store.getState().ui.sidebarCollapsed).toBe(false);
    store.getState().toggleSidebar();
    expect(store.getState().ui.sidebarCollapsed).toBe(true);
    expect(savedUi(store.getState().ui)).toMatchObject({ sidebarCollapsed: true });
    expect(restoreUi({ sidebarCollapsed: true }).sidebarCollapsed).toBe(true);
    expect(restoreUi({ sidebarCollapsed: "sim" }).sidebarCollapsed).toBe(false);
    store.getState().toggleSidebar();
    expect(store.getState().ui.sidebarCollapsed).toBe(false);
  });

  it("restores the Scout's chips, off when saved wrong or not at all, and ignores the old comparison chip", () => {
    expect(restoreUi({ mode: "percentile", onlyCompared: true, moneyball: "sim", searches: { scout: "x" } })).toEqual({
      mode: "percentile",
      selectedUid: null,
      notice: null,
      searches: {},
      moneyball: false,
      signingsMoneyball: false,
      compare: [],
      graphs: { axes: {}, labels: 10 },
      cartView: "carrinho",
      elenco: { slot: 0, tab: "elenco" },
      sidebarCollapsed: false,
      role: null,
      pitchView: "comPosse",
      period: "season",
    });
    expect(restoreUi({ onlyCompared: { busca: true, todos: true, moneyball: false } })).not.toHaveProperty(
      "onlyCompared",
    );
  });

  it("the compare list holds up to three players, for the session only", () => {
    const store = createAppStore();
    expect(MAX_COMPARE).toBe(3);
    for (const uid of [7, 8, 9, 10]) store.getState().toggleCompare(uid);
    expect(store.getState().ui.compare).toEqual([7, 8, 9]);
    store.getState().toggleCompare(8);
    expect(store.getState().ui.compare).toEqual([7, 9]);
    expect(savedUi(store.getState().ui)).not.toHaveProperty("compare");
  });

  it("a selection replaces the compare list, up to three players", () => {
    const store = createAppStore();
    store.getState().toggleCompare(1);
    store.getState().setCompare([7, 8]);
    expect(store.getState().ui.compare).toEqual([7, 8]);
    store.getState().setCompare([7, 8, 9, 10]);
    expect(store.getState().ui.compare).toEqual([7, 8, 9]);
  });

  it("the Carrinho page view (cart or Shortlist) is a session thing, never saved", () => {
    const store = createAppStore();
    store.getState().setCartView("shortlist");
    expect(store.getState().ui.cartView).toBe("shortlist");
    expect(savedUi(store.getState().ui)).not.toHaveProperty("cartView");
  });

  it("the Elenco's slot and tab are a session thing, never saved", () => {
    const store = createAppStore();
    store.getState().setElencoView({ slot: 4, tab: "contratacoes" });
    expect(store.getState().ui.elenco).toEqual({ slot: 4, tab: "contratacoes" });
    expect(savedUi(store.getState().ui)).not.toHaveProperty("elenco");
    expect(restoreUi({ elenco: { slot: 4, tab: "contratacoes" } }).elenco).toEqual({ slot: 0, tab: "elenco" });
  });

  it("the graph axes are a session thing, never saved", () => {
    const store = createAppStore();
    store.getState().setGraphAxes("ATA", { x: "xG/90", y: "G/90" });
    expect(savedUi(store.getState().ui)).not.toHaveProperty("graphs");
  });

  it("the cart holds one entry per player and kind", () => {
    const store = createAppStore();
    const buy = { uid: 7, kind: "buy", fee: 1_000_000, wage: 5_000, name: "Alvo" } as const;
    store.getState().addToCart(buy);
    store.getState().addToCart({ ...buy, fee: 2 });
    store.getState().addToCart({ ...buy, kind: "sell" });
    expect(store.getState().cart.items).toEqual([buy, { ...buy, kind: "sell" }]);
    store.getState().removeFromCart(7, "buy");
    expect(store.getState().cart.items).toEqual([{ ...buy, kind: "sell" }]);
  });

  it("adds and takes out many moves at once, still one entry per player and kind", () => {
    const store = createAppStore();
    const buy = (uid: number) => ({ uid, kind: "buy", fee: uid, wage: 1, name: `J${uid}` }) as const;
    store.getState().addToCart(buy(7));
    store.getState().addManyToCart([buy(7), buy(8), { ...buy(9), kind: "sell" }, buy(8)]);
    expect(store.getState().cart.items.map((i) => `${i.kind}:${i.uid}`)).toEqual(["buy:7", "buy:8", "sell:9"]);
    store.getState().removeManyFromCart([
      { uid: 7, kind: "buy" },
      { uid: 9, kind: "sell" },
      { uid: 9, kind: "buy" },
    ]);
    expect(store.getState().cart.items.map((i) => `${i.kind}:${i.uid}`)).toEqual(["buy:8"]);
  });

  it("edits a planned move's fee and wage in place", () => {
    const store = createAppStore();
    const buy = { uid: 7, kind: "buy", fee: 1_000_000, wage: 5_000, name: "Alvo" } as const;
    store.getState().addToCart(buy);
    store.getState().addToCart({ ...buy, kind: "sell" });
    store.getState().updateCartItem(7, "buy", { fee: 2_500_000 });
    store.getState().updateCartItem(7, "buy", { wage: 18_000 });
    expect(store.getState().cart.items).toEqual([
      { ...buy, fee: 2_500_000, wage: 18_000 },
      { ...buy, kind: "sell" },
    ]);
  });

  it("settles the cart against a snapshot for good, and clears the settled moves", () => {
    const store = createAppStore();
    const club = 301344;
    const signed = playerRecord({ club_uid: club });
    const target = playerRecord({ club_uid: 9 });
    store.getState().addToCart({ uid: signed.uid, kind: "buy", fee: 1, wage: 1, name: "Contratado" });
    store.getState().addToCart({ uid: target.uid, kind: "buy", fee: 1, wage: 1, name: "Alvo" });
    store.getState().addToCart({ uid: 999_999, kind: "sell", fee: 1, wage: 1, name: "Sumiu" });
    store.getState().settleCart(snapshotOf([signed, target]), club);
    expect(store.getState().cart.items.map((i) => i.status)).toEqual(["contratado", undefined, undefined]);
    expect(store.getState().cart.items[0].settledFor).toBe(club);

    const before = store.getState().cart;
    store.getState().settleCart(snapshotOf([signed, target]), club);
    expect(store.getState().cart).toBe(before);

    store.getState().settleCart(snapshotOf([{ ...signed, club_uid: 9 }, target]), club);
    expect(store.getState().cart.items[0].status).toBe("contratado");

    store.getState().clearSettled(42);
    expect(store.getState().cart.items).toHaveLength(3);
    store.getState().clearSettled(club);
    expect(store.getState().cart.items.map((i) => i.name)).toEqual(["Alvo", "Sumiu"]);
  });

  it("a move settled under one club is planned again under another, and settles for that one in turn", () => {
    const store = createAppStore();
    const player = playerRecord({ club_uid: 301344 });
    store.getState().addToCart({ uid: player.uid, kind: "buy", fee: 1, wage: 1, name: "Alvo" });
    store.getState().settleCart(snapshotOf([player]), 301344);
    expect(store.getState().cart.items[0]).toMatchObject({ status: "contratado", settledFor: 301344 });

    store.getState().settleCart(snapshotOf([{ ...player, club_uid: 42 }]), 42);
    expect(store.getState().cart.items[0]).toMatchObject({ status: "contratado", settledFor: 42 });
  });

  it("keeps a target number of signings per club", () => {
    const store = createAppStore();
    store.getState().setSigningTarget(301344, 5);
    store.getState().setSigningTarget(42, 2);
    store.getState().setSigningTarget(42, null);
    expect(store.getState().cart.targets).toEqual({ "301344": 5 });
  });

  it("toggleShortlist adds and removes a player in the first folder", () => {
    const store = createAppStore();
    store.getState().toggleShortlist(7);
    store.getState().toggleShortlist(8);
    expect(store.getState().shortlist.folders[0].uids).toEqual([7, 8]);
    store.getState().toggleShortlist(7);
    expect(store.getState().shortlist.folders[0].uids).toEqual([8]);
  });

  it("creates, renames and deletes shortlist folders, never the last one", () => {
    const store = createAppStore();
    const alvos = store.getState().createFolder("  Alvos de janeiro  ");
    expect(store.getState().shortlist.folders.map((f) => f.name)).toEqual(["Shortlist", "Alvos de janeiro"]);
    expect(store.getState().createFolder("   ")).toBeNull();

    store.getState().renameFolder(alvos!, "Laterais");
    store.getState().renameFolder(alvos!, "");
    expect(store.getState().shortlist.folders[1]).toEqual({ id: alvos, name: "Laterais", uids: [] });

    store.getState().deleteFolder("shortlist");
    expect(store.getState().shortlist.folders.map((f) => f.id)).toEqual([alvos]);
    store.getState().deleteFolder(alvos!);
    expect(store.getState().shortlist.folders.map((f) => f.id)).toEqual([alvos]);
  });

  it("moves a player between folders without duplicating him", () => {
    const store = createAppStore();
    const laterais = store.getState().createFolder("Laterais")!;
    store.getState().toggleShortlist(7);
    store.getState().toggleShortlist(8);
    store.getState().toggleShortlist(8, laterais);
    store.getState().moveToFolder([7, 8], "shortlist", laterais);
    const [first, second] = store.getState().shortlist.folders;
    expect(first.uids).toEqual([]);
    expect(second.uids).toEqual([8, 7]);
  });

  it("adds many players to a folder, the ones already there kept once and in place", () => {
    const store = createAppStore();
    store.getState().toggleShortlist(8);
    store.getState().addToFolder([7, 8, 9, 7], "shortlist");
    expect(store.getState().shortlist.folders[0].uids).toEqual([8, 7, 9]);
  });

  it("takes players out of a folder", () => {
    const store = createAppStore();
    store.getState().toggleShortlist(7);
    store.getState().toggleShortlist(8);
    store.getState().removeFromFolder([7, 99], "shortlist");
    expect(store.getState().shortlist.folders[0].uids).toEqual([8]);
  });

  describe("effective lineup", () => {
    const club = 301344;
    const T = sampleTactic();
    const gamePicks = Object.fromEntries(T.slots.map((s, k) => [String(k), s.playerId]));
    const moved = () => moveSlot(shapeFromTactic(T)!, 8, "ip", { row: 2, col: 3 })!;
    const edited = () => {
      const store = createAppStore();
      store.getState().editLineup(club, { base: tacticKey(T), name: T.name, slots: moved() }, gamePicks);
      return store;
    };

    it("follows the game's tactic until an edit, then keeps the edit", () => {
      const store = createAppStore();
      const fromGame = effectiveLineup(lineupOf(store.getState().fit, club), T);
      expect(fromGame).toMatchObject({ source: "game", name: T.name, base: tacticKey(T), gameChanged: false });
      expect(fromGame.picks["10"]).toBe(11);

      store.getState().editLineup(club, { base: tacticKey(T), name: T.name, slots: moved() }, gamePicks);
      const kept = effectiveLineup(lineupOf(store.getState().fit, club), T);
      expect(kept.source).toBe("app");
      expect(kept.slots[8].ip.position).toBe("AMC");
    });

    it("keeps an edit when the game's tactic changes, and says so", () => {
      const store = edited();
      const changed = sampleTactic([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 77]);
      const kept = effectiveLineup(lineupOf(store.getState().fit, club), changed);
      expect(kept).toMatchObject({ source: "app", gameChanged: true });

      store.getState().resetLineup(club);
      const back = effectiveLineup(lineupOf(store.getState().fit, club), changed);
      expect(back.source).toBe("game");
      expect(back.picks["10"]).toBe(77);
    });

    it("without a tactic, the formation's shape and its picks", () => {
      const store = createAppStore();
      store.getState().editLineup(club, { base: null, name: null, slots: shapeFromFormation("4-3-3") }, { "2": 8 });
      store.getState().setFormation(club, "4-3-3");
      const plain = effectiveLineup(lineupOf(store.getState().fit, club), null);
      expect(plain).toMatchObject({ source: "formation", name: null, base: null, picks: {} });
      expect(plain.slots).toEqual(shapeFromFormation("4-3-3"));
    });

    it("an unreadable tactic counts as no tactic", () => {
      const broken = sampleTactic();
      broken.slots[3].ip.side = "R";
      const store = createAppStore();
      expect(effectiveLineup(lineupOf(store.getState().fit, club), broken).source).toBe("formation");
    });

    it("sends the engine the shape's slots with the picks, and the formation alone otherwise", () => {
      const { fit } = createAppStore().getState();
      expect(lineupFor(fit, club, T)).toEqual({
        formation: "4-3-3",
        picks: Object.fromEntries(Array.from({ length: 11 }, (_, k) => [String(k), k + 1])),
        slots: ["GK", "D(R)", "D(C)", "D(C)", "D(L)", "AM(L)", "M(C)", "M(C)", "M(C)", "AM(R)", "ST(C)"],
        roles: shapeFromTactic(T)!.map((slot) => slot.ip.roleId),
      });
      expect(lineupFor(fit, club, null)).toEqual({
        formation: "4-3-3",
        picks: {},
        roles: shapeFromFormation("4-3-3").map((slot) => slot.ip.roleId),
      });
      expect(lineupFor(fit, null, T)).toBeUndefined();
    });

    it("a formation change drops the edit", () => {
      const store = edited();
      store.getState().setFormation(club, "4-4-2");
      expect(lineupOf(store.getState().fit, club)).toEqual({ formation: "4-4-2", picks: {} });
    });
  });

  it("updating the theme leaves the engine settings object alone, so nothing is re-analysed", () => {
    const store = createAppStore();
    const { engine } = store.getState().settings;
    store.getState().updateSettings({ theme: "light" });
    expect(store.getState().settings.engine).toBe(engine);
  });
});

describe("usableFilters", () => {
  it("keeps what the analysis can answer and drops the rest, so a stale filter never fails the engine", () => {
    const filters: FilterSpec[] = [
      { col: "age", kind: "range", max: 23 },
      { col: "minha-composta", kind: "range", min: 1 },
      { col: "nope", kind: "range", min: 1 },
      { col: "club", kind: "set", values: [] },
      { col: "pct:G/90", kind: "range", min: 75 },
      { col: "perf", kind: "range", min: 90 },
      { col: "perf-ATA", kind: "range", min: 90 },
      { col: "actions-def", kind: "range", min: 3 },
    ];
    expect(usableFilters(filters, ["actions-def"]).map((f) => f.col)).toEqual([
      "age",
      "pct:G/90",
      "perf",
      "actions-def",
    ]);
  });
});

describe("game tactic", () => {
  it("is the tactic of the snapshot on show, and null without one", () => {
    const store = createAppStore();
    expect(gameTacticOf(store.getState().data)).toBeNull();
    const tactic: Tactic = {
      name: "4-3-3 Com Extremos Cauteloso - Contra-Ataque Directo",
      style: "Contra-Ataque Directo",
      slots: [
        {
          ip: { position: "GK", side: "C", roleId: "ip:53" },
          oop: { position: "GK", side: "C", roleId: "oop:0" },
          playerId: 1001,
        },
      ],
      subs: [1002],
    };
    store.getState().setData({ snapshot: snapshotOf([], { tactic }) });
    expect(gameTacticOf(store.getState().data)).toBe(tactic);
    store.getState().setData({ snapshot: snapshotOf([]) });
    expect(gameTacticOf(store.getState().data)).toBeNull();
  });
});
