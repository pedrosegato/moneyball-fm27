import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fakeSource } from "@/store/testing";
import { Shell } from "./Shell";
import { renderWithData, resetApp, startData } from "./testing";

describe("Shell", () => {
  afterEach(resetApp);

  it("holds a data page behind a loading state until the first analysis lands", async () => {
    const fake = fakeSource();
    fake.source.loadPlayers.mockImplementation(() => new Promise(() => {}));
    const { controller } = startData(fake);
    window.location.hash = "#/elenco";
    renderWithData(<Shell />, controller);
    expect(await screen.findByRole("main")).toHaveTextContent("Lendo o jogo…");
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
  });

  it("offers a retry when the first load fails", async () => {
    const fake = fakeSource();
    fake.source.loadPlayers.mockRejectedValueOnce("FM27 não está aberto");
    const { controller } = startData(fake);
    window.location.hash = "#/elenco";
    renderWithData(<Shell />, controller);
    expect(await screen.findByRole("heading", { name: "Sem dados do jogo" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("FM27 não está aberto");
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(fake.source.loadPlayers).toHaveBeenCalledTimes(2);
  });

  it("holds a page whose code is still on its way behind a quiet placeholder, not an empty screen", async () => {
    const fake = fakeSource();
    fake.source.loadPlayers.mockImplementation(() => new Promise(() => {}));
    const { controller } = startData(fake);
    window.location.hash = "#/config";
    renderWithData(<Shell />, controller);
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("aria-busy", "true");
    expect(main.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(main).toHaveAttribute("data-delayed");
    expect(await screen.findByRole("navigation", { name: "Seções de Configurações" })).toBeInTheDocument();
  });

  it("the page header has no search: the Scout's is in the head of its table", async () => {
    const { controller } = startData();
    window.location.hash = "#/scout";
    renderWithData(<Shell />, controller);
    const table = await screen.findByRole("region", { name: "Tabela de jogadores" }, { timeout: 5000 });
    expect(within(table).getByRole("searchbox", { name: "Buscar nesta lista" })).toBeInTheDocument();
    expect(within(screen.getByRole("banner")).queryByRole("searchbox")).toBeNull();
  });

  it("shows Configurações without waiting for data", async () => {
    const fake = fakeSource();
    fake.source.loadPlayers.mockImplementation(() => new Promise(() => {}));
    const { controller } = startData(fake);
    window.location.hash = "#/config";
    renderWithData(<Shell />, controller);
    expect(await screen.findByRole("navigation", { name: "Seções de Configurações" })).toBeInTheDocument();
    expect(screen.getByRole("main")).not.toHaveAttribute("aria-busy", "true");
  });
});
