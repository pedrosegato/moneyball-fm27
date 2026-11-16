import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithData, resetApp, startData } from "@/shell/testing";
import { appStore } from "@/store/index";
import { fakeSource, testSnapshot } from "@/store/testing";
import { CompositesEditor } from "./CompositesEditor";
import { Settings } from "./Settings";

const CREATOR = { "xA/90": 1, "KP/90": 1, "CCC/90": 2 };

describe("Configurações", () => {
  afterEach(resetApp);

  it("restores every default only after asking, keeping the user's composites and the scope", async () => {
    const user = userEvent.setup();
    const id = appStore.getState().addCustomComposite("Criador", CREATOR)!;
    act(() => {
      appStore.getState().updateSettings({ theme: "light", pollSeconds: 30, scope: "league" });
      appStore.getState().setCompositeWeights("perf-ATA", { "npG/90": 5 });
    });
    renderWithData(<Settings />, startData().controller);

    await user.click(screen.getByRole("button", { name: "Restaurar todos os padrões…" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(appStore.getState().settings.theme).toBe("light");

    await user.click(screen.getByRole("button", { name: "Restaurar todos os padrões…" }));
    await user.click(screen.getByRole("button", { name: "Restaurar padrões" }));
    const { settings, composites } = appStore.getState();
    expect(settings).toMatchObject({ theme: "dark", pollSeconds: 5, scope: "league" });
    expect(composites.custom.map((c) => c.id)).toEqual([id]);
  });

  it("sets the league weight from 0 to 3 in steps of 0,5, on by default", async () => {
    const user = userEvent.setup();
    renderWithData(<Settings />, startData().controller);
    const section = screen.getByRole("region", { name: "Análise" });
    const weights = within(section).getByRole("radiogroup", { name: "Peso da liga" });
    expect(
      within(weights)
        .getAllByRole("radio")
        .map((r) => r.textContent),
    ).toEqual(["Desligado", "0,5×", "1×", "1,5×", "2×", "2,5×", "3×"]);
    expect(within(weights).getByRole("radio", { name: "1×" })).toBeChecked();
    await user.click(within(weights).getByRole("radio", { name: "2,5×" }));
    expect(appStore.getState().settings.engine.leagueAdjustment).toBe(2.5);
    await user.click(within(weights).getByRole("radio", { name: "Desligado" }));
    expect(appStore.getState().settings.engine.leagueAdjustment).toBe(0);
    await user.click(within(section).getByRole("button", { name: "Restaurar padrão" }));
    expect(appStore.getState().settings.engine.leagueAdjustment).toBe(1);
  });

  it("picks the games read in Jogo, reading the game again with the chosen scope", async () => {
    const user = userEvent.setup();
    const data = startData();
    renderWithData(<Settings />, data.controller);
    const game = screen.getByRole("region", { name: "Jogo" });
    const scopes = within(game).getByRole("radiogroup", { name: "Jogos lidos" });
    expect(
      within(scopes)
        .getAllByRole("radio")
        .map((r) => r.textContent),
    ).toEqual(["Só oficiais", "Todos"]);
    expect(within(scopes).getByRole("radio", { name: "Só oficiais" })).toBeChecked();
    await vi.waitFor(() => expect(data.source.loadPlayers).toHaveBeenCalled());
    data.source.loadPlayers.mockClear();
    await user.click(within(scopes).getByRole("radio", { name: "Todos" }));
    expect(appStore.getState().settings.scope).toBe("all");
    await vi.waitFor(() => expect(data.source.loadPlayers).toHaveBeenCalledWith("all", false, expect.any(Function)));
  });

  it("shows a scope saved from the old bar beside the two it offers", () => {
    act(() => appStore.getState().updateSettings({ scope: "league" }));
    renderWithData(<Settings />, startData().controller);
    const scopes = screen.getByRole("radiogroup", { name: "Jogos lidos" });
    expect(
      within(scopes)
        .getAllByRole("radio")
        .map((r) => r.textContent),
    ).toEqual(["Só oficiais", "Todos", "Só a liga"]);
    expect(within(scopes).getByRole("radio", { name: "Só a liga" })).toBeChecked();
  });

  it("shows the game's currency, rate and wage period read-only, with no currency to pick", async () => {
    const fake = fakeSource();
    fake.setStatus({
      ok: true,
      build: "6AE8CF77-17969000",
      build_known: true,
      money: { currency: { code: "EUR", symbol: "€", name: "Euro" }, rate: 1.1641011238098145, wage_period: "month" },
    });
    renderWithData(<Settings />, startData(fake).controller);
    const money = screen.getByRole("region", { name: "Moeda" });
    await vi.waitFor(() => expect(money).toHaveTextContent("Euro (€), salários por mês"));
    expect(money).toHaveTextContent("£1 = €1,1641");
    expect(within(money).queryByRole("radio")).toBeNull();
    expect(within(money).queryByRole("textbox")).toBeNull();
  });

  it("says when the game's currency could not be read and values stay in pounds", async () => {
    const data = startData(fakeSource(testSnapshot()));
    renderWithData(<Settings />, data.controller);
    await vi.waitFor(() => expect(data.source.loadPlayers).toHaveBeenCalled());
    expect(screen.getByRole("region", { name: "Moeda" })).toHaveTextContent(
      "Não lida: valores em libras, salários por semana",
    );
  });
});

describe("CompositesEditor", () => {
  afterEach(resetApp);

  it("keeps an edit that breaks a rule on screen with what to fix, and does not save it", async () => {
    const user = userEvent.setup();
    const id = appStore.getState().addCustomComposite("Criador", CREATOR)!;
    renderWithData(<CompositesEditor item={id} />, startData().controller);

    expect(screen.getByRole("button", { name: "Tirar xA/90" })).toBeDisabled();

    const name = screen.getByRole("textbox", { name: "Nome da composta" });
    await user.clear(name);
    await user.type(name, "Ações criativas/90{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("Já existe uma composta com esse nome.");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(appStore.getState().composites.custom[0].label).toBe("Criador");

    await user.clear(name);
    await user.type(name, "Armador{Enter}");
    expect(appStore.getState().composites.custom[0].label).toBe("Armador");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
