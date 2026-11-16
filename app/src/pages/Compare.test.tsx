import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STATS } from "@/engine/stats/catalog";
import { snapshotOf } from "@/engine/testing/records";
import { PlayerSheet } from "@/player/components/PlayerSheet";
import { renderWithData, resetApp, startData } from "@/shell/testing";
import { appStore } from "@/store/index";
import { fakeSource } from "@/store/testing";
import { demoPlayer, demoPlayers, ratings, worstCasePlayers } from "@/table/fixtures";
import { Compare } from "./Compare";
import { rowLeaders } from "./compare/lib/leaders";
import { assignSlots } from "./compare/lib/slots";

const worst = worstCasePlayers();
const demo = demoPlayers(30);
const snapshot = snapshotOf([...demo, ...worst]);
const named = (name: string) => worst.find((p) => p.name === name)!;

async function openCompare(uids: number[], served = snapshot) {
  const data = startData(fakeSource(served));
  act(() => appStore.setState((s) => ({ ui: { ...s.ui, compare: uids } })));
  renderWithData(
    <>
      <Compare />
      <PlayerSheet />
    </>,
    data.controller,
  );
  await vi.waitFor(() => expect(appStore.getState().data.analysis).not.toBeNull());
  return data;
}

const compared = () => {
  const list = screen.getByRole("list", { name: "Jogadores comparados" });
  return within(list)
    .getAllByRole("listitem")
    .filter((item) => item.parentElement === list);
};

describe("Compare", () => {
  afterEach(resetApp);

  it("puts up to 3 players side by side, each with a Remover", async () => {
    const [a, b, c] = demo;
    await openCompare([a.uid, b.uid, c.uid]);
    const items = compared();
    expect(items).toHaveLength(3);
    items.forEach((item, k) => {
      expect(item).toHaveTextContent([a, b, c][k].name!);
    });
    const stats = screen.getByRole("table", { name: "Stats lado a lado" });
    for (const p of [a, b, c]) expect(within(stats).getByRole("columnheader", { name: p.name! })).toBeInTheDocument();
    expect(within(stats).getAllByRole("row").length).toBeGreaterThan(5);

    await userEvent.click(within(items[1]).getByRole("button", { name: `Remover ${b.name}` }));
    expect(appStore.getState().ui.compare).toEqual([a.uid, c.uid]);
    expect(compared()).toHaveLength(2);
    expect(within(stats).queryByRole("columnheader", { name: b.name! })).not.toBeInTheDocument();
  });

  it("opens a compared player's panel", async () => {
    const [a, b] = demo;
    await openCompare([a.uid, b.uid]);
    await userEvent.click(within(compared()[1]).getByRole("button", { name: `Abrir ${b.name}` }));
    expect(appStore.getState().ui.selectedUid).toBe(b.uid);
  });

  it("Esc on a panel opened from Abrir perfil hands focus back to that button, by pointer or by keyboard", async () => {
    const [a, b] = demo;
    await openCompare([a.uid, b.uid]);
    const user = userEvent.setup();
    const open = within(compared()[1]).getByRole("button", { name: `Abrir ${b.name}` });

    await user.click(open);
    expect(screen.getByRole("dialog", { name: b.name! })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(appStore.getState().ui.selectedUid).toBeNull();
    expect(open).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: b.name! })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(appStore.getState().ui.selectedUid).toBeNull();
    expect(open).toHaveFocus();
  });

  it("with nobody lined up, points to Comparar in the player panel", async () => {
    await openCompare([]);
    expect(screen.getByRole("heading", { name: "Ninguém para comparar" })).toBeInTheDocument();
    expect(screen.getByText(/Comparar/, { selector: "p, div" })).toHaveTextContent(/painel do jogador/);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("keeps a player the save no longer has removable, instead of failing", async () => {
    const [a] = demo;
    await openCompare([a.uid, 987_654_321]);
    const items = compared();
    expect(items).toHaveLength(2);
    expect(items[1]).toHaveTextContent("não está mais no save");
    await userEvent.click(within(items[1]).getByRole("button", { name: "Remover jogador indisponível" }));
    expect(appStore.getState().ui.compare).toEqual([a.uid]);
  });

  it("paints every value as a tier chip and marks each row's leader, ties included, with no overall verdict", async () => {
    const [a, b, c] = demo;
    await openCompare([a.uid, b.uid, c.uid]);
    const { analysis } = appStore.getState().data;
    const stats = screen.getByRole("table", { name: "Stats lado a lado" });
    const rows = stats.querySelectorAll<HTMLElement>("tbody tr[data-stat]");
    expect(rows.length).toBeGreaterThan(5);
    let led = 0;
    for (const row of rows) {
      const def = STATS.find((d) => d.key === row.dataset.stat)!;
      const values = [a, b, c].map((p) => analysis!.cols[def.key][analysis!.uids.indexOf(p.uid)]);
      const expected = rowLeaders(values, def);
      const cells = [a, b, c].map((p) => row.querySelector<HTMLElement>(`td[data-player="${p.uid}"]`)!);
      cells.forEach((cell, k) => {
        expect(cell.querySelector('[data-slot="stat-cell"]'), def.key).not.toBeNull();
        expect(cell.hasAttribute("data-leader"), `${def.key} ${k}`).toBe(expected[k]);
        if (expected[k]) expect(cell).toHaveTextContent("líder da linha");
      });
      led += expected.filter(Boolean).length;
    }
    expect(led).toBeGreaterThan(0);
    expect(screen.getByRole("main").textContent).not.toMatch(/melhor jogador|contrate|vencedor/i);
  });

  it("explains the leader's outline against the chip colour, from the pointer and the keyboard", async () => {
    const user = userEvent.setup();
    await openCompare([demo[0].uid, demo[1].uid]);
    const legend = screen.getByText("Melhor valor da linha (empates marcam todos)");
    const why = "o destaque compara o valor; a cor compara cada um com os da posição dele";
    await user.hover(legend);
    expect(await screen.findByText(why, {}, { timeout: 2000 })).toBeInTheDocument();
    await user.unhover(legend);
    expect(legend).toBeInstanceOf(HTMLButtonElement);
  });

  describe("against each player's own position", () => {
    const strikers = Array.from({ length: 24 }, (_, k) => demoPlayer(k, { pos: ratings("ST") }));
    const defenders = Array.from({ length: 24 }, (_, k) => demoPlayer(100 + k, { pos: ratings("DC") }));
    const twoGroups = snapshotOf([...strikers, ...defenders]);
    const [striker, defender] = [strikers[0], defenders[0]];
    const said = (uid: number) =>
      [
        ...screen
          .getByRole("table", { name: "Stats lado a lado" })
          .querySelectorAll(`td[data-player="${uid}"] .sr-only`),
      ]
        .map((el) => el.textContent)
        .join(" | ");

    it("colours each against his own group, and names each group when they differ", async () => {
      await openCompare([striker.uid, defender.uid], twoGroups);
      expect(screen.queryByRole("group", { name: "Comparando com" })).toBeNull();
      expect(
        screen.getByText(
          `Cada um contra os da posição dele com 300+ min: ${striker.name} contra os atacantes; ${defender.name} contra os zagueiros`,
        ),
      ).toBeInTheDocument();
      expect(said(striker.uid)).toMatch(/percentil \d+ contra os atacantes com 300\+ min/);
      expect(said(defender.uid)).toMatch(/percentil \d+ contra os zagueiros com 300\+ min/);
      expect(said(defender.uid)).not.toMatch(/atacantes/);
      expect(screen.getByRole("button", { name: "Stats da posição: Atacante" })).toBeInTheDocument();
    });

    it("takes the head-to-head stats from the first player's group, and says one group once", async () => {
      await openCompare([defender.uid, striker.uid], twoGroups);
      expect(screen.getByRole("button", { name: "Stats da posição: Zagueiro" })).toBeInTheDocument();
      act(() => appStore.setState((s) => ({ ui: { ...s.ui, compare: [striker.uid, strikers[1].uid] } })));
      expect(await screen.findByText("Contra os atacantes com 300+ min")).toBeInTheDocument();
    });
  });

  it("marks no leader with one player alone", async () => {
    await openCompare([demo[0].uid]);
    const stats = screen.getByRole("table", { name: "Stats lado a lado" });
    expect(stats.querySelectorAll("[data-leader]")).toHaveLength(0);
  });

  it("puts Perf. on each card as a tier chip", async () => {
    const [a, b] = demo;
    await openCompare([a.uid, b.uid]);
    for (const card of compared()) {
      const ficha = within(card).getByRole("list", { name: "Ficha" });
      for (const label of ["Perf."]) {
        const fact = within(ficha).getByText(label, { exact: true }).parentElement!;
        expect(fact.querySelector('[data-slot="stat-cell"]'), label).not.toBeNull();
      }
    }
  });

  it("shows — for what is missing, never NaN, undefined or 0%", async () => {
    const unplayed = named("Tifany Hoyos");
    await openCompare([unplayed.uid, named("João Henrique Gonçalves de Albuquerque Júnior").uid, named("김민재").uid]);
    const main = screen.getByRole("main");
    expect(main.textContent).not.toMatch(/NaN|undefined|null|Infinity/);
    expect(main.textContent).not.toMatch(/(^|[^\d,])0%/);
    const stats = screen.getByRole("table", { name: "Stats lado a lado" });
    const firstRow = within(stats).getAllByRole("row")[1];
    expect(within(firstRow).getAllByRole("cell")[0]).toHaveTextContent("—");
  });
});

describe("assignSlots", () => {
  it("keeps each player's colour when another leaves, and gives a newcomer the first free one", () => {
    let slots = assignSlots([11, 22, 33], new Map());
    expect([...slots]).toEqual([
      [11, 0],
      [22, 1],
      [33, 2],
    ]);
    slots = assignSlots([22, 33], slots);
    expect([...slots]).toEqual([
      [22, 1],
      [33, 2],
    ]);
    slots = assignSlots([22, 33, 44], slots);
    expect(slots.get(44)).toBe(0);
  });
});
