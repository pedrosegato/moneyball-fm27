import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { appStore } from "@/store/index";
import { budgetSource, computeBudget } from "../lib/budget";
import { BudgetBar } from "./BudgetBar";

describe("BudgetBar", () => {
  afterEach(() => appStore.setState(appStore.getInitialState(), true));

  it('shows "—" for the wage bill and what is left while no snapshot has been read', () => {
    const source = budgetSource(null, { transfer: 10_000_000, wageWeekly: 400_000 });
    const moves = { purchases: [], sales: [] };
    const budget = computeBudget({
      transferBudget: source.transfer,
      wageBudgetWeekly: source.wageWeekly,
      currentWageBill: null,
      ...moves,
      slotsLeft: 0,
    });
    render(<BudgetBar source={source} budget={budget} moves={moves} currentWageBill={null} onManual={null} />);
    const wages = screen.getByRole("region", { name: "Salários" });
    expect(wages).toHaveTextContent("Restante —");
    expect(wages).toHaveTextContent("Folha atual —");
    expect(within(wages).getByRole("meter", { name: "Salários" })).toHaveAttribute(
      "aria-valuetext",
      "Folha atual ainda não lida",
    );
  });

  it("keeps the typed budget over an unverified reading of the game, offering the read value to copy", async () => {
    const source = budgetSource(
      { club_uid: 1, transfer_budget: 1_120_000, wage_budget_weekly: 157_249, verified: false },
      { transfer: 24_000_000, wageWeekly: 157_249 },
    );
    const moves = { purchases: [], sales: [] };
    const budget = computeBudget({
      transferBudget: source.transfer,
      wageBudgetWeekly: source.wageWeekly,
      currentWageBill: 100_000,
      ...moves,
      slotsLeft: 0,
    });
    const onManual = vi.fn();
    render(<BudgetBar source={source} budget={budget} moves={moves} currentWageBill={100_000} onManual={onManual} />);

    const transfers = screen.getByRole("region", { name: "Transferências" });
    expect(within(transfers).getByRole("textbox", { name: "Verba de transferências" })).toHaveValue("£24,0M");
    expect(transfers).toHaveTextContent("Lido do jogo (não verificado): £1,1M");
    await userEvent.click(within(transfers).getByRole("button", { name: "Usar a verba lida do jogo, £1,1M" }));
    expect(onManual).toHaveBeenCalledWith({ transfer: 1_120_000 });

    const wages = screen.getByRole("region", { name: "Salários" });
    expect(wages).not.toHaveTextContent("não verificado");
  });

  it("shows a verified reading of the game in place of the field", () => {
    const source = budgetSource(
      { club_uid: 1, transfer_budget: 1_120_000, wage_budget_weekly: null, verified: true },
      undefined,
    );
    const moves = { purchases: [], sales: [] };
    const budget = computeBudget({
      transferBudget: source.transfer,
      wageBudgetWeekly: source.wageWeekly,
      currentWageBill: null,
      ...moves,
      slotsLeft: 0,
    });
    render(<BudgetBar source={source} budget={budget} moves={moves} currentWageBill={null} onManual={vi.fn()} />);
    const transfers = screen.getByRole("region", { name: "Transferências" });
    expect(transfers).toHaveTextContent("Lido do jogo £1,1M");
    expect(within(transfers).queryByRole("textbox")).toBeNull();
    expect(transfers).not.toHaveTextContent("não verificado");
  });

  it("shows the wage ceiling and the wages per month in euros when the game does, keeping weekly pounds inside", async () => {
    act(() =>
      appStore.setState((s) => ({
        data: {
          ...s.data,
          status: {
            ok: true,
            money: {
              currency: { code: "EUR", symbol: "€", name: "Euro" },
              rate: 1.1641011238098145,
              wage_period: "month",
            },
          },
        },
      })),
    );
    const source = budgetSource(
      { club_uid: 1, transfer_budget: 1_123_660, wage_budget_weekly: 169_422, verified: false },
      { transfer: null, wageWeekly: 157_249 },
    );
    const moves = { purchases: [], sales: [] };
    const budget = computeBudget({
      transferBudget: source.transfer,
      wageBudgetWeekly: source.wageWeekly,
      currentWageBill: 100_000,
      ...moves,
      slotsLeft: 0,
    });
    const onManual = vi.fn();
    render(<BudgetBar source={source} budget={budget} moves={moves} currentWageBill={100_000} onManual={onManual} />);

    const transfers = screen.getByRole("region", { name: "Transferências" });
    expect(transfers).toHaveTextContent("Lido do jogo (não verificado): €1,3M");
    const wages = screen.getByRole("region", { name: "Salários" });
    expect(wages).toHaveTextContent("Teto por mês");
    const ceiling = within(wages).getByRole("textbox", { name: "Teto salarial por mês" });
    expect(ceiling).toHaveValue("€793 mil");
    expect(wages).toHaveTextContent("Lido do jogo (não verificado): €855 mil");
    expect(wages).toHaveTextContent("Folha atual −€504 mil");
    expect(wages).toHaveTextContent("/mês");

    await userEvent.clear(ceiling);
    await userEvent.type(ceiling, "£650 mil{Enter}");
    expect(onManual).toHaveBeenCalledWith({ wageWeekly: 150_000 });
  });
});
