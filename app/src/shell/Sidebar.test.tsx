import { act, render as renderBare, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { playerRecord, snapshotOf } from "@/engine/testing/records";
import { appStore } from "@/store/index";
import { Sidebar } from "./Sidebar";
import { resetApp } from "./testing";

const render = (ui: ReactNode) => renderBare(<TooltipProvider>{ui}</TooltipProvider>);
const rail = () => screen.getByRole("complementary", { name: "Barra lateral" });

const nav = () => screen.getByRole("navigation", { name: "Navegação" });
const meter = () => screen.getByRole("region", { name: "Verba da janela" });

const MFC = 301344;
const snapshot = snapshotOf(
  [
    playerRecord({ uid: 1, club_uid: 9 }),
    playerRecord({ uid: 2, club_uid: MFC }),
    playerRecord({ uid: 3, club_uid: MFC }),
  ],
  { my_clubs: [{ name: "MFC", uid: MFC }] },
);

describe("Sidebar", () => {
  afterEach(resetApp);

  it("lists the pages in pt-BR, Configurações at the foot", () => {
    render(<Sidebar route={{ page: "scout" }} />);
    expect(
      within(nav())
        .getAllByRole("link")
        .map((a) => a.textContent),
    ).toEqual(["Scout", "Elenco", "Shortlist", "Comparar", "Gráficos"]);
    expect(screen.getByRole("link", { name: "Configurações" })).toHaveAttribute("href", "#/config");
  });

  it("marks the page open as current", () => {
    const { rerender } = render(<Sidebar route={{ page: "scout" }} />);
    const scout = () => screen.getByRole("link", { name: "Scout" });
    expect(scout()).toHaveAttribute("aria-current", "page");
    expect(scout()).toHaveAttribute("href", "#/scout");

    rerender(
      <TooltipProvider>
        <Sidebar route={{ page: "elenco" }} />
      </TooltipProvider>,
    );
    expect(scout()).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Elenco" })).toHaveAttribute("aria-current", "page");
  });

  it("opens the Shortlist half of the Carrinho page, the cart itself living in the header", async () => {
    const { rerender } = render(<Sidebar route={{ page: "elenco" }} />);
    const shortlist = screen.getByRole("link", { name: "Shortlist" });
    expect(shortlist).toHaveAttribute("href", "#/carrinho");
    await userEvent.click(shortlist);
    expect(appStore.getState().ui.cartView).toBe("shortlist");

    rerender(
      <TooltipProvider>
        <Sidebar route={{ page: "carrinho" }} />
      </TooltipProvider>,
    );
    expect(screen.getByRole("link", { name: "Shortlist" })).toHaveAttribute("aria-current", "page");
    act(() => appStore.getState().setCartView("carrinho"));
    expect(screen.getByRole("link", { name: "Shortlist" })).not.toHaveAttribute("aria-current");
  });

  it("collapses to its icons and back from the chevron at its top, by mouse or keyboard", async () => {
    render(<Sidebar route={{ page: "scout" }} />);
    const toggle = () => screen.getByRole("button", { name: "Barra lateral" });
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(toggle()).toHaveAttribute("aria-controls", rail().id);
    expect(rail()).toHaveAttribute("data-collapsed", "false");

    await userEvent.click(toggle());
    expect(appStore.getState().ui.sidebarCollapsed).toBe(true);
    expect(rail()).toHaveAttribute("data-collapsed", "true");
    expect(toggle()).toHaveAttribute("aria-expanded", "false");

    toggle().focus();
    await userEvent.keyboard("{Enter}");
    expect(appStore.getState().ui.sidebarCollapsed).toBe(false);
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(toggle()).toHaveFocus();
  });

  it("hands focus to the toggle when the part holding it closes with the rail", () => {
    render(<Sidebar route={{ page: "elenco" }} />);
    within(meter()).getByRole("link", { name: "Definir no Carrinho" }).focus();
    act(() => appStore.getState().toggleSidebar());
    expect(screen.getByRole("button", { name: "Barra lateral" })).toHaveFocus();
  });

  it("collapsed, keeps every page's name for screen readers and on hover, and drops the meter", async () => {
    appStore.getState().toggleSidebar();
    render(<Sidebar route={{ page: "scout" }} />);
    expect(
      within(nav())
        .getAllByRole("link")
        .map((a) => a.textContent),
    ).toEqual(["Scout", "Elenco", "Shortlist", "Comparar", "Gráficos"]);
    expect(screen.queryByRole("region", { name: "Verba da janela" })).toBeNull();

    await userEvent.hover(screen.getByRole("link", { name: "Elenco" }));
    expect(
      await screen.findByText("Elenco", { selector: '[data-slot="tooltip-content"]' }, { timeout: 2000 }),
    ).toBeVisible();
  });

  it("asks for a budget when neither the reader nor the user gave one", async () => {
    appStore.getState().setCartView("shortlist");
    render(<Sidebar route={{ page: "elenco" }} />);
    expect(meter()).toHaveTextContent("Sem verba definida");
    const set = within(meter()).getByRole("link", { name: "Definir no Carrinho" });
    expect(set).toHaveAttribute("href", "#/carrinho");
    await userEvent.click(set);
    expect(appStore.getState().ui.cartView).toBe("carrinho");
  });

  it("shows what is left of the club's budget after the cart's buys and sales", () => {
    appStore.getState().setData({ snapshot });
    appStore.getState().setManualBudget(301344, { transfer: 24_000_000, wageWeekly: null });
    appStore.getState().addToCart({ uid: 1, kind: "buy", fee: 8_300_000, wage: 1, name: "A" });
    appStore.getState().addToCart({ uid: 2, kind: "sell", fee: 2_900_000, wage: 1, name: "B" });
    render(<Sidebar route={{ page: "elenco" }} />);
    expect(meter()).toHaveTextContent("£24,0M");
    expect(meter()).toHaveTextContent("Restante £18,6M (78%)");
  });

  it("prefers the budget the reader found in the save", () => {
    appStore.getState().setData({
      snapshot,
      finances: { club_uid: 301344, transfer_budget: 10_000_000, wage_budget_weekly: null, verified: true },
    });
    appStore.getState().setManualBudget(301344, { transfer: 24_000_000, wageWeekly: null });
    render(<Sidebar route={{ page: "elenco" }} />);
    expect(meter()).toHaveTextContent("£10,0M");
  });

  it("never shows budgets the reader found for another club", () => {
    appStore.getState().setData({
      snapshot,
      finances: { club_uid: 9, transfer_budget: 10_000_000, wage_budget_weekly: null, verified: true },
    });
    appStore.getState().setManualBudget(301344, { transfer: 24_000_000, wageWeekly: null });
    render(<Sidebar route={{ page: "elenco" }} />);
    expect(meter()).toHaveTextContent("£24,0M");
  });

  it("flags a budget the cart has gone over", () => {
    appStore.getState().setData({ snapshot });
    appStore.getState().setManualBudget(301344, { transfer: 24_000_000, wageWeekly: null });
    appStore.getState().addToCart({ uid: 1, kind: "buy", fee: 27_500_000, wage: 1, name: "A" });
    render(<Sidebar route={{ page: "elenco" }} />);
    expect(meter()).toHaveTextContent("Estourou £3,5M");
  });

  it("counts only the moves still planned: not a signing the game made, nor a player gone from the save", () => {
    appStore.getState().setData({ snapshot });
    appStore.getState().setManualBudget(MFC, { transfer: 24_000_000, wageWeekly: null });
    appStore.getState().addToCart({ uid: 1, kind: "buy", fee: 8_300_000, wage: 1, name: "A" });
    appStore.getState().addToCart({ uid: 3, kind: "buy", fee: 5_000_000, wage: 1, name: "Já contratado" });
    appStore.getState().addToCart({ uid: 404, kind: "buy", fee: 9_000_000, wage: 1, name: "Aposentado" });
    render(<Sidebar route={{ page: "elenco" }} />);
    expect(meter()).toHaveTextContent("Restante £15,7M (65%)");
  });
});
