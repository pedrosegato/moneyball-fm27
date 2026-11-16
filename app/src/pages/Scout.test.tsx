import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { snapshotOf } from "@/engine/testing/records";
import { PlayerSheet } from "@/player/components/PlayerSheet";
import { renderWithData, resetApp, startData } from "@/shell/testing";
import { appStore } from "@/store/index";
import { fakeSource } from "@/store/testing";
import { demoPlayer, demoPlayers, ratings } from "@/table/fixtures";
import { Scout } from "./Scout";

const players = [...demoPlayers(30), demoPlayer(40, { name: "Goleiro Reserva", pos: ratings("GK"), minutes: 90 })];
const snapshot = snapshotOf(players, { my_clubs: [{ name: "MFC", uid: 301344 }] });

const tableStatus = () => within(screen.getByRole("region", { name: "Tabela de jogadores" })).getByRole("status");
const columnIds = () => screen.getAllByRole("columnheader").map((th) => th.dataset.columnId);
const strikersOnly = () =>
  act(() => appStore.getState().setFilter("scout", { col: "naturalPositions", kind: "set", values: ["ST"] }));

describe("Scout", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(2000);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1200);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetApp();
  });

  it("opens with no filter and no comparison: every player listed, and nothing to say who to compare with", async () => {
    const { controller } = startData(fakeSource(snapshot));
    renderWithData(<Scout />, controller);
    await vi.waitFor(() => expect(tableStatus()).toHaveTextContent("31 jogadores"));
    expect(screen.queryByRole("group", { name: "Comparando com" })).toBeNull();
    expect(screen.queryByRole("button", { name: /comparação/ })).toBeNull();
    expect(appStore.getState().filters.scout).toEqual([]);
  });

  it("picks the league weight of Performance in the toolbar, starting on the measured one", async () => {
    const user = userEvent.setup();
    const { controller } = startData(fakeSource(snapshot));
    renderWithData(<Scout />, controller);
    const control = await screen.findByRole("radiogroup", { name: "Peso da liga na Performance" });
    const options = within(control).getAllByRole("radio");
    expect(options.map((o) => o.textContent)).toEqual(["Sem peso", "Peso medido"]);
    expect(within(control).getByRole("radio", { name: "Peso medido" })).toBeChecked();

    await user.click(within(control).getByRole("radio", { name: "Sem peso" }));
    expect(appStore.getState().settings.engine.leagueWeighting).toBe("none");
    await user.click(within(control).getByRole("radio", { name: "Peso medido" }));
    expect(appStore.getState().settings.engine.leagueWeighting).toBe("measured");
  });

  it("shows the Atacante preset under a Pos filter on strikers, and the Geral one without it", async () => {
    const { controller } = startData(fakeSource(snapshot));
    renderWithData(<Scout />, controller);
    await vi.waitFor(() => expect(columnIds()).toContain("perf"));
    expect(columnIds()).not.toContain("SoT/90");
    strikersOnly();
    await vi.waitFor(() => expect(columnIds()).toEqual(expect.arrayContaining(["SoT/90", "SoT%", "Conv%"])));
    expect(columnIds()).not.toContain("perf");
    act(() => appStore.getState().clearFilters("scout"));
    await vi.waitFor(() => expect(columnIds()).toContain("perf"));
  });

  it("filters by position from the Posição control, and the column preset follows it", async () => {
    const user = userEvent.setup();
    const { controller } = startData(fakeSource(snapshot));
    renderWithData(<Scout />, controller);
    await vi.waitFor(() => expect(tableStatus()).toHaveTextContent("31 jogadores"));
    const control = () => screen.getByRole("button", { name: /^Posição: / });
    expect(control()).toHaveTextContent("Posição: Todas");

    await user.click(control());
    await user.click(await screen.findByRole("menuitemradio", { name: "Atacante" }));
    expect(appStore.getState().filters.scout).toEqual([{ col: "naturalPositions", kind: "set", values: ["ST"] }]);
    await vi.waitFor(() => expect(columnIds()).toEqual(expect.arrayContaining(["SoT/90", "SoT%", "Conv%"])));
    expect(control()).toHaveTextContent("Posição: Atacante");
    expect(screen.queryByRole("button", { name: /^Editar filtro Pos/ })).toBeNull();

    await user.click(control());
    await user.click(await screen.findByRole("menuitemradio", { name: "Linha (sem goleiros)" }));
    await vi.waitFor(() => expect(tableStatus()).toHaveTextContent("30 de 31 jogadores"));
    expect(control()).toHaveTextContent("Posição: Linha");
    expect(columnIds()).toContain("perf");

    await user.click(control());
    await user.click(await screen.findByRole("menuitemradio", { name: "Todas" }));
    expect(appStore.getState().filters.scout).toEqual([]);
    expect(control()).toHaveTextContent("Posição: Todas");
  });

  it("the Posição control reads a Pos filter set from the column, keeping the chip when it is no single group", async () => {
    const { controller } = startData(fakeSource(snapshot));
    renderWithData(<Scout />, controller);
    await vi.waitFor(() => expect(tableStatus()).toHaveTextContent("31 jogadores"));
    const control = () => screen.getByRole("button", { name: /^Posição: / });
    const setPositions = (...values: string[]) =>
      act(() => appStore.getState().setFilter("scout", { col: "naturalPositions", kind: "set", values }));

    setPositions("WBR", "DL", "DR", "WBL");
    expect(control()).toHaveTextContent("Posição: Lateral");
    expect(screen.queryByRole("button", { name: /^Editar filtro Pos/ })).toBeNull();

    setPositions("ST", "DC");
    expect(control()).toHaveTextContent("Posição: personalizada");
    expect(screen.getByRole("button", { name: "Editar filtro Pos: ST, DC" })).toBeInTheDocument();
  });

  it("narrows the table to the name or club searched, and says so when nobody matches", async () => {
    const { controller } = startData(fakeSource(snapshot));
    renderWithData(<Scout />, controller);
    await vi.waitFor(() => expect(tableStatus()).toHaveTextContent("31 jogadores"));
    act(() => appStore.getState().setSearch("scout", "goleiro reserva"));
    await vi.waitFor(() => expect(tableStatus()).toHaveTextContent("1 de 31 jogadores"));
    act(() => appStore.getState().setSearch("scout", "Ninguém Assim"));
    const heading = await screen.findByRole("heading", { name: "Nenhum jogador" });
    const empty = heading.closest<HTMLElement>('[data-slot="empty"]')!;
    expect(within(empty).getByText(/Ninguém com “Ninguém Assim” no nome ou no clube/)).toBeInTheDocument();
    await userEvent.click(within(empty).getByRole("button", { name: "Limpar busca" }));
    expect(appStore.getState().ui.searches.scout).toBe("");
  });

  it("turns Moneyball on as a chip beside the others, its criteria one button away and saved in the engine settings", async () => {
    const user = userEvent.setup();
    const { controller } = startData(fakeSource(snapshot));
    renderWithData(<Scout />, controller);
    await vi.waitFor(() => expect(tableStatus()).toHaveTextContent("31 jogadores"));
    expect(screen.queryByRole("button", { name: /^Critérios/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Só subvalorizados (Moneyball)" }));
    expect(appStore.getState().ui.moneyball).toBe(true);
    expect(screen.getByRole("button", { name: "Remover filtro Só subvalorizados (Moneyball)" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: /^Critérios/ }));
    const criteria = await screen.findByRole("group", { name: "Critérios do Moneyball" });
    const ratio = within(criteria).getByRole("textbox", { name: /^Razão mínima/ });
    expect(ratio).toHaveValue("2");
    expect(within(criteria).getByRole("textbox", { name: /^Performance mínima/ })).toHaveValue("60");
    const fair = within(criteria).getByRole("textbox", { name: /^Valor justo mínimo/ });
    expect(fair).toHaveValue("0,25");

    await user.clear(ratio);
    await user.type(ratio, "3,5{Enter}");
    await user.clear(fair);
    await user.type(fair, "1{Enter}");
    expect(appStore.getState().settings.engine.moneyball).toMatchObject({
      minRatio: 3.5,
      minFair: 1_000_000,
      minPerf: 60,
    });
    expect(screen.getByRole("button", { name: /^Critérios/, hidden: true })).toHaveTextContent("Critérios (alterados)");

    await user.clear(ratio);
    await user.type(ratio, "dois{Enter}");
    expect(ratio).toHaveAttribute("aria-invalid", "true");
    expect(appStore.getState().settings.engine.moneyball.minRatio).toBe(3.5);
    await user.keyboard("{Escape}");
    expect(ratio).toHaveValue("3,5");
    expect(ratio).not.toHaveAttribute("aria-invalid");

    await user.click(within(criteria).getByRole("button", { name: "Restaurar padrões" }));
    expect(appStore.getState().settings.engine.moneyball).toMatchObject({ minRatio: 2, minFair: 250_000, minPerf: 60 });
  });

  it("lists Moneyball with its ratio, Stats vs ability and contract left, most undervalued first", async () => {
    appStore.getState().setMoneyball(true);
    const { controller } = startData(fakeSource(snapshot));
    renderWithData(<Scout />, controller);
    await vi.waitFor(() =>
      expect(columnIds()).toEqual(expect.arrayContaining(["fair", "valueRatio", "statsVsAbility", "monthsLeft"])),
    );
    const ratio = screen.getAllByRole("columnheader").find((th) => th.dataset.columnId === "valueRatio")!;
    expect(ratio).toHaveAttribute("aria-sort", "descending");
  });

  it("shows Moneyball's Performance in each player's own group, the score its list was picked by", async () => {
    appStore.getState().setFilter("scout", { col: "naturalPositions", kind: "set", values: ["ST"] });
    appStore.getState().setMoneyball(true);
    const { controller } = startData(fakeSource(snapshot));
    renderWithData(<Scout />, controller);
    await vi.waitFor(() => expect(columnIds()).toContain("valueRatio"));
    expect(columnIds()[columnIds().indexOf("valueRatio") + 1]).toBe("perf");
  });

  it("Escape inside the open player panel closes the panel and keeps the rows selected", async () => {
    const user = userEvent.setup();
    const { controller } = startData(fakeSource(snapshot));
    renderWithData(
      <>
        <Scout />
        <PlayerSheet />
      </>,
      controller,
    );
    await vi.waitFor(() => expect(tableStatus()).toHaveTextContent("31 jogadores"));
    const selection = () => screen.queryByRole("toolbar", { name: "Seleção" });
    const firstRow = within(screen.getByTestId("player-rows"))
      .getAllByRole("row")
      .find((r) => r.dataset.player)!;
    await user.click(within(firstRow).getByRole("checkbox"));
    expect(selection()).toHaveTextContent("1 selecionado");

    const opened = players[1];
    act(() => appStore.getState().selectPlayer(opened.uid));
    const sheet = screen.getByRole("dialog", { name: opened.name });
    act(() => within(sheet).getByRole("button", { name: "Fechar" }).focus());
    await user.keyboard("{Escape}");

    expect(appStore.getState().ui.selectedUid).toBeNull();
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(selection()).toHaveTextContent("1 selecionado");
  });
});
