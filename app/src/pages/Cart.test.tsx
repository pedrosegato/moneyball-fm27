import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { snapshotOf } from "@/engine/testing/records";
import { renderWithData, resetApp, startData } from "@/shell/testing";
import type { CartItem } from "@/store/cart";
import { cartItemOf } from "@/store/cart";
import { appStore } from "@/store/index";
import { fakeSource } from "@/store/testing";
import { demoPlayer, ratings, worstCasePlayers } from "@/table/fixtures";
import { Cart } from "./Cart";

const MY = 301344;
const OTHER = 50;

const alvoAtacante = demoPlayer(1, {
  name: "Alvo Atacante",
  club: "Viking",
  club_uid: OTHER,
  pos: ratings("ST"),
  wage: 40_000,
});
const alvoZagueiro = demoPlayer(2, {
  name: "Alvo Zagueiro",
  club: "Viking",
  club_uid: OTHER,
  pos: ratings("DC", { DM: 18 }),
  wage: 18_000,
});
const venda = demoPlayer(3, { name: "Vende-se", club: "MFC", club_uid: MY, wage: 25_000 });
const contratado = demoPlayer(4, {
  name: "Já Contratado",
  club: "MFC",
  club_uid: MY,
  pos: ratings("AMR"),
  wage: 30_000,
});
const vendido = demoPlayer(6, { name: "Já Vendido", club: "Viking", club_uid: OTHER, wage: 20_000 });
const elenco = demoPlayer(7, { name: "Resto do Elenco", club: "MFC", club_uid: MY, wage: 300_000 });
const snapshot = snapshotOf([alvoAtacante, alvoZagueiro, venda, contratado, vendido, elenco], {
  my_clubs: [{ name: "MFC", uid: MY }],
  date: "2026-11-11",
});

const line = (uid: number, kind: CartItem["kind"], fee: number, wage: number, name: string): CartItem => ({
  uid,
  kind,
  fee,
  wage,
  name,
});
const CART: CartItem[] = [
  line(alvoAtacante.uid, "buy", 8_000_000, 40_000, alvoAtacante.name),
  line(alvoZagueiro.uid, "buy", 2_500_000, 18_000, alvoZagueiro.name),
  line(venda.uid, "sell", 3_000_000, 25_000, venda.name),
  line(contratado.uid, "buy", 5_000_000, 30_000, contratado.name),
  line(999_001, "buy", 9_000_000, 50_000, "Aposentado Há Tempos"),
  line(vendido.uid, "sell", 4_000_000, 20_000, vendido.name),
];

const table = () => screen.getByRole("table", { name: "Jogadores" });
const rowOf = (name: string) => {
  const row = [...table().querySelectorAll<HTMLElement>("tbody tr[data-player]")].find((r) =>
    within(r).queryByText(name),
  );
  if (!row) throw new Error(`no row for ${name}`);
  return row;
};
const cellOf = (name: string, column: string) =>
  rowOf(name).querySelector<HTMLElement>(`[data-column-id="${column}"]`)!;
const bar = () => screen.getByRole("toolbar", { name: "Seleção" });
const transfers = () => screen.getByRole("region", { name: "Transferências" });
const wages = () => screen.getByRole("region", { name: "Salários" });

async function openCart({ items = CART, budget = true, from = snapshot } = {}) {
  for (const item of items) appStore.getState().addToCart(item);
  if (budget) appStore.getState().setManualBudget(MY, { transfer: 24_000_000, wageWeekly: 500_000 });
  const { controller } = startData(fakeSource(from));
  renderWithData(<Cart />, controller);
  await vi.waitFor(() => expect(appStore.getState().data.snapshot).not.toBeNull());
}

describe("Carrinho", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(2000);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1400);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetApp();
  });

  it("lists buys and sales in the same table as every page, with what the snapshot says happened", async () => {
    await openCart();
    expect(cellOf("Alvo Atacante", "cartKind")).toHaveTextContent("Compra");
    expect(cellOf("Alvo Atacante", "cartStatus")).toHaveTextContent("Previsto");
    expect(cellOf("Já Contratado", "cartStatus")).toHaveTextContent("Contratado");
    expect(cellOf("Vende-se", "cartKind")).toHaveTextContent("Venda");
    expect(cellOf("Vende-se", "cartStatus")).toHaveTextContent("Previsto");
    expect(cellOf("Já Vendido", "cartStatus")).toHaveTextContent("Vendido");
    const strip = screen.getByRole("status", { name: "Fora do save" });
    expect(strip).toHaveTextContent("Aposentado Há Tempos");
    expect(within(strip).getByRole("button", { name: "Tirar do carrinho" })).toBeInTheDocument();
    expect(screen.getByRole("main").textContent).not.toMatch(/NaN|undefined|null|Infinity/);
  });

  it("has no action column in the table: taking a move out goes through the selection's bar", async () => {
    const user = userEvent.setup();
    await openCart();
    expect(within(table()).queryByRole("button", { name: /do carrinho$/ })).not.toBeInTheDocument();
    await user.click(within(rowOf("Alvo Zagueiro")).getByRole("checkbox"));
    await user.click(within(rowOf("Vende-se")).getByRole("checkbox"));
    expect(bar()).toHaveTextContent("2 selecionados");
    await user.click(within(bar()).getByRole("button", { name: "Tirar do carrinho" }));
    expect(appStore.getState().cart.items.map((i) => i.name)).toEqual([
      "Alvo Atacante",
      "Já Contratado",
      "Aposentado Há Tempos",
      "Já Vendido",
    ]);
  });

  it("narrows the table to the purchases or the sales", async () => {
    const user = userEvent.setup();
    await openCart();
    const kinds = screen.getByRole("radiogroup", { name: "Movimento" });
    await user.click(within(kinds).getByRole("radio", { name: "Vendas 2" }));
    const names = [...table().querySelectorAll<HTMLElement>("tbody tr[data-player]")].map((r) => r.dataset.player);
    expect(names).toEqual([String(venda.uid), String(vendido.uid)]);
  });

  it("budget bar: what is left after the planned moves only, the wage bill counted once", async () => {
    await openCart();
    expect(transfers()).toHaveTextContent("Restante £16,5M (69%)");
    expect(wages()).toHaveTextContent("Restante £112 mil (22%)");
    expect(wages()).toHaveTextContent("Folha atual −£355 mil");
  });

  it("counts the arrivals on the pitch by natural position, the confirmed signing included", async () => {
    await openCart();
    const pitch = screen.getByRole("list", { name: "Chegadas por posição" });
    expect(within(pitch).getByLabelText(/^Atacante \(ST\): 1 jogador/)).toHaveTextContent("1");
    expect(within(pitch).getByLabelText(/^Zagueiro \(DC\): 1 jogador/)).toHaveTextContent("1");
    expect(within(pitch).getByLabelText(/^Volante \(DM\): 1 jogador/)).toHaveTextContent("1");
    expect(within(pitch).getByLabelText(/^Ponta direita \(AMR\): 1 jogador/)).toHaveTextContent("1");
    expect(within(pitch).getByLabelText("Goleiro (GK): nenhum jogador")).toHaveTextContent("0");
  });

  it("edits a fee inline and the bar follows; text that is not an amount is flagged, not saved", async () => {
    const user = userEvent.setup();
    await openCart();
    const fee = within(rowOf("Alvo Atacante")).getByRole("textbox", { name: "Taxa de Alvo Atacante" });
    expect(fee).toHaveValue("£8,0M");
    await user.clear(fee);
    await user.type(fee, "5,5M{Enter}");
    expect(appStore.getState().cart.items[0].fee).toBe(5_500_000);
    expect(fee).toHaveValue("£5,5M");
    expect(transfers()).toHaveTextContent("Restante £19,0M");

    const wage = within(rowOf("Alvo Atacante")).getByRole("textbox", { name: "Salário semanal de Alvo Atacante" });
    await user.clear(wage);
    await user.type(wage, "muito{Enter}");
    expect(wage).toHaveAttribute("aria-invalid", "true");
    expect(appStore.getState().cart.items[0].wage).toBe(40_000);
  });

  it("shows fees, wages and the wage ceiling the way the game does, keeping weekly pounds in the cart", async () => {
    const user = userEvent.setup();
    const money = {
      currency: { code: "EUR", symbol: "€", name: "Euro" },
      rate: 1.25,
      wage_period: "month",
    } as const;
    await openCart({ from: { ...snapshot, money } });
    expect(cellOf("Alvo Atacante", "wage")).toHaveTextContent("€217 mil");
    expect(within(rowOf("Alvo Atacante")).getByRole("textbox", { name: "Taxa de Alvo Atacante" })).toHaveValue(
      "€10,0M",
    );
    const wage = within(rowOf("Alvo Atacante")).getByRole("textbox", { name: "Salário mensal de Alvo Atacante" });
    expect(wage).toHaveValue("€217 mil");
    await user.clear(wage);
    await user.type(wage, "260 mil{Enter}");
    expect(appStore.getState().cart.items[0].wage).toBe(48_000);
    expect(wage).toHaveValue("€260 mil");
    expect(within(wages()).getByRole("textbox", { name: "Teto salarial por mês" })).toHaveValue("€2,7M");
  });

  it("warns when the cart goes over but never blocks it", async () => {
    const user = userEvent.setup();
    await openCart();
    const fee = within(rowOf("Alvo Zagueiro")).getByRole("textbox", { name: "Taxa de Alvo Zagueiro" });
    await user.clear(fee);
    await user.type(fee, "£30M{Enter}");
    expect(transfers()).toHaveTextContent("Estourou £11,0M");
    expect(screen.getByText(/passam da verba em £11,0M/)).toBeInTheDocument();
    expect(fee).toBeEnabled();
    await user.click(within(rowOf("Alvo Zagueiro")).getByRole("checkbox"));
    await user.click(within(bar()).getByRole("button", { name: "Tirar do carrinho" }));
    expect(transfers()).toHaveTextContent("Restante £19,0M");
  });

  it("takes the budget typed for this save, and keeps it under the club", async () => {
    const user = userEvent.setup();
    await openCart({ budget: false });
    expect(transfers()).toHaveTextContent("Sem verba definida");
    await user.type(screen.getByRole("textbox", { name: "Verba de transferências" }), "£20M{Enter}");
    await user.type(screen.getByRole("textbox", { name: "Teto salarial por semana" }), "450 mil{Enter}");
    expect(appStore.getState().cart.budgets[String(MY)]).toEqual({ transfer: 20_000_000, wageWeekly: 450_000 });
    expect(transfers()).toHaveTextContent("Restante £12,5M (63%)");
  });

  it("keeps the typed budget while the game's reading is unverified, offering it to copy, and shows it once verified", async () => {
    const user = userEvent.setup();
    await openCart({ budget: false });
    appStore
      .getState()
      .setData({ finances: { club_uid: MY, transfer_budget: 10_000_000, wage_budget_weekly: null, verified: false } });
    await vi.waitFor(() => expect(transfers()).toHaveTextContent("Lido do jogo (não verificado): £10,0M"));
    expect(screen.getByRole("textbox", { name: "Verba de transferências" })).toBeInTheDocument();
    await user.click(within(transfers()).getByRole("button", { name: "Usar a verba lida do jogo, £10,0M" }));
    expect(appStore.getState().cart.budgets[String(MY)]).toMatchObject({ transfer: 10_000_000 });

    act(() =>
      appStore
        .getState()
        .setData({ finances: { club_uid: MY, transfer_budget: 10_000_000, wage_budget_weekly: null, verified: true } }),
    );
    await vi.waitFor(() =>
      expect(screen.queryByRole("textbox", { name: "Verba de transferências" })).not.toBeInTheDocument(),
    );
    expect(transfers()).toHaveTextContent("Lido do jogo £10,0M");
    expect(screen.getByRole("textbox", { name: "Teto salarial por semana" })).toBeInTheDocument();
  });

  it("shares what is left between the signings still to make", async () => {
    const user = userEvent.setup();
    await openCart();
    const slots = screen.getByRole("region", { name: "Vagas" });
    const target = within(slots).getByRole("textbox", { name: "Contratações planejadas na janela" });
    expect(target).toHaveValue("3");
    expect(slots).toHaveTextContent("1 vaga restante, £16,5M por vaga");
    await user.clear(target);
    await user.type(target, "6{Enter}");
    expect(appStore.getState().cart.targets[String(MY)]).toBe(6);
    expect(slots).toHaveTextContent("4 vagas restantes");
    expect(slots).toHaveTextContent("£4,1M por vaga");
  });

  it("says nothing is left for the slots once the purchases pass the budget, rather than £0 a slot", async () => {
    const user = userEvent.setup();
    await openCart();
    const verba = screen.getByRole("textbox", { name: "Verba de transferências" });
    await user.clear(verba);
    await user.type(verba, "£1M{Enter}");
    const slots = screen.getByRole("region", { name: "Vagas" });
    expect(slots).toHaveTextContent("1 vaga restante. A verba já acabou");
  });

  it("draws each budget as a meter a screen reader can read", async () => {
    await openCart();
    const meter = within(transfers()).getByRole("meter", { name: "Transferências" });
    expect(meter).toHaveAttribute("value", "7500000");
    expect(meter).toHaveAttribute("max", "24000000");
    expect(meter).toHaveAttribute("aria-valuetext", "Restante £16,5M, 69% da verba");
  });

  it("keeps a typo flagged when the field is left, rather than dropping it", async () => {
    const user = userEvent.setup();
    await openCart();
    const fee = within(rowOf("Alvo Atacante")).getByRole("textbox", { name: "Taxa de Alvo Atacante" });
    await user.clear(fee);
    await user.type(fee, "8,O M");
    await user.tab();
    expect(fee).toHaveAttribute("aria-invalid", "true");
    expect(fee).toHaveValue("8,O M");
    expect(appStore.getState().cart.items[0].fee).toBe(8_000_000);
  });

  it("clears the moves the game settled, and removes a player missing from the save", async () => {
    const user = userEvent.setup();
    await openCart();
    await user.click(
      within(screen.getByRole("status", { name: "Fora do save" })).getByRole("button", { name: "Tirar do carrinho" }),
    );
    await user.click(screen.getByRole("button", { name: "Limpar concluídos" }));
    expect(appStore.getState().cart.items.map((i) => i.name)).toEqual(["Alvo Atacante", "Alvo Zagueiro", "Vende-se"]);
  });

  it("says how to fill an empty cart", async () => {
    await openCart({ items: [] });
    expect(screen.getByRole("heading", { name: "Carrinho vazio" })).toBeInTheDocument();
  });

  it("takes the worst cases: long and non-Latin names, no club, no wage, the game's no-valuation sentinels", async () => {
    const worst = worstCasePlayers();
    const from = snapshotOf([...worst, elenco], { my_clubs: [{ name: "MFC", uid: MY }], date: "2026-11-11" });
    await openCart({ items: worst.map((p) => cartItemOf(p, "buy")), from });
    const text = screen.getByRole("main").textContent ?? "";
    expect(text).not.toMatch(/NaN|undefined|null|Infinity/);
    for (const p of worst) expect(rowOf(p.name)).toBeInTheDocument();
    const sentinel = worst.find((p) => p.value === 4_294_967_295)!;
    expect(within(rowOf(sentinel.name)).getByRole("textbox", { name: `Taxa de ${sentinel.name}` })).toHaveValue("£0");
    expect(within(rowOf(sentinel.name)).getByText(/Sem clube/)).toBeInTheDocument();
  });
});
