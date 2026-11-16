import { act, screen, within } from "@testing-library/react";
import { appStore } from "@/store/index";
import { hrefOf, parseRoute } from "./Router";
import { Shell } from "./Shell";
import { renderWithData, resetApp, startData } from "./testing";

describe("parseRoute", () => {
  it("reads each page from the hash", () => {
    expect(parseRoute("#/elenco")).toEqual({ page: "elenco" });
    expect(parseRoute("#/config")).toEqual({ page: "config" });
    expect(parseRoute("#/scout")).toEqual({ page: "scout" });
    expect(parseRoute("#/scout/moneyball")).toEqual({ page: "scout" });
  });

  it("reads the Configurações section and the composite open in its editor", () => {
    expect(parseRoute("#/config/compostas")).toEqual({ page: "config", section: "compostas" });
    expect(parseRoute("#/config/compostas/perf-ATA")).toEqual({
      page: "config",
      section: "compostas",
      item: "perf-ATA",
    });
    expect(parseRoute("#/config/nada")).toEqual({ page: "config" });
    expect(parseRoute("#/config/compostas/%E0%A4%A")).toEqual({ page: "config", section: "compostas" });
  });

  it("opens the Elenco for the old Tactical fit address", () => {
    expect(parseRoute("#/fit")).toEqual({ page: "elenco" });
  });

  it("opens Scout when the hash names no page it knows", () => {
    for (const hash of ["", "#", "#/", "#/nada", "#/scout/nada", "#/elenco/x", "#/constructor", "#/rank"]) {
      expect(parseRoute(hash), hash).toEqual(hash === "#/elenco/x" ? { page: "elenco" } : { page: "scout" });
    }
  });

  it("writes hrefs parseRoute reads back", () => {
    for (const route of [
      { page: "graficos" },
      { page: "scout" },
      { page: "config" },
      { page: "config", section: "compostas" },
      { page: "config", section: "compostas", item: "custom-1" },
      { page: "config", section: "compostas", item: "meu índice/2" },
    ] as const) {
      expect(parseRoute(hrefOf(route))).toEqual(route);
    }
  });
});

describe("Shell routing", () => {
  afterEach(resetApp);

  const goTo = (hash: string) =>
    act(() => {
      window.location.hash = hash;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

  it("shows each page's pt-BR title", () => {
    const { controller } = startData();
    renderWithData(<Shell />, controller);
    const pages = [
      ["#/scout", "Scout"],
      ["#/elenco", "Elenco"],
      ["#/fit", "Elenco"],
      ["#/carrinho", "Carrinho"],
      ["#/comparar", "Comparar"],
      ["#/graficos", "Gráficos"],
      ["#/config", "Configurações"],
    ];
    for (const [hash, title] of pages) {
      goTo(hash);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(title);
    }
  });

  it("titles the Carrinho page after the half on show, the cart or the Shortlist", () => {
    const { controller } = startData();
    renderWithData(<Shell />, controller);
    goTo("#/carrinho");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Carrinho");
    act(() => appStore.getState().setCartView("shortlist"));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Shortlist");
    expect(screen.getByRole("link", { name: "Shortlist" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /^Carrinho/ })).not.toHaveAttribute("aria-current");
  });

  it("keeps the cart in the header, next to the game's status", () => {
    const { controller } = startData();
    renderWithData(<Shell />, controller);
    const header = screen.getByRole("banner");
    expect(within(header).getByRole("group", { name: "Status do jogo" })).toBeInTheDocument();
    expect(within(header).getByRole("link", { name: "Carrinho" })).toHaveAttribute("href", "#/carrinho");
  });

  it("marks the page shown as the current one in the sidebar", () => {
    const { controller } = startData();
    renderWithData(<Shell />, controller);
    goTo("#/graficos");
    expect(screen.getByRole("link", { name: "Gráficos" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Elenco" })).not.toHaveAttribute("aria-current");
  });
});
