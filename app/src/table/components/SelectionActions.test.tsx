import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { snapshotOf } from "@/engine/testing/records";
import { renderWithData, resetApp, startData } from "@/shell/testing";
import { appStore } from "@/store/index";
import { fakeSource } from "@/store/testing";
import { demoPlayer } from "../fixtures";
import type { SelectionAction } from "../lib/selectionActions";
import { PLAYER_ACTIONS } from "../playerActions";
import { SelectionActions } from "./SelectionActions";

const MY = 301344;
const alvo = demoPlayer(1, { name: "Alvo Um", club_uid: 50, value: 8_000_000, wage: 40_000 });
const outro = demoPlayer(2, { name: "Alvo Dois", club_uid: 51, value: 2_000_000, wage: 10_000 });
const terceiro = demoPlayer(3, { name: "Alvo Três", club_uid: 52 });
const quarto = demoPlayer(4, { name: "Alvo Quatro", club_uid: 53 });
const nosso = demoPlayer(5, { name: "Nosso Zagueiro", club: "MFC", club_uid: MY, value: 3_000_000, wage: 25_000 });
const snapshot = snapshotOf([alvo, outro, terceiro, quarto, nosso], { my_clubs: [{ name: "MFC", uid: MY }] });

async function bar(players: (typeof alvo)[], actions: readonly SelectionAction[] = PLAYER_ACTIONS) {
  const { controller } = startData(fakeSource(snapshot));
  const clear = vi.fn();
  renderWithData(
    <div role="toolbar" aria-label="Seleção">
      <SelectionActions actions={actions} selection={{ players, clear }} />
    </div>,
    controller,
  );
  await vi.waitFor(() => expect(appStore.getState().data.snapshot).not.toBeNull());
  return { clear };
}

const button = (name: string | RegExp) => within(screen.getByRole("toolbar")).getByRole("button", { name });
const cart = () => appStore.getState().cart.items.map((i) => [i.kind, i.uid, i.fee, i.wage]);

describe("floating bar actions", () => {
  afterEach(resetApp);

  it("puts a selection of targets in the cart as purchases at the market value, and takes them out once all are in", async () => {
    const user = userEvent.setup();
    await bar([alvo, outro]);
    expect(screen.queryByRole("button", { name: /^Vender/ })).not.toBeInTheDocument();
    await user.click(button("Adicionar ao carrinho"));
    expect(cart()).toEqual([
      ["buy", alvo.uid, 8_000_000, 40_000],
      ["buy", outro.uid, 2_000_000, 10_000],
    ]);
    expect(button("Adicionar ao carrinho")).toHaveAttribute("aria-pressed", "true");
    await user.click(button("Adicionar ao carrinho"));
    expect(cart()).toEqual([]);
  });

  it("adds only the ones missing when some are already in the cart", async () => {
    const user = userEvent.setup();
    appStore.getState().addToCart({ uid: alvo.uid, kind: "buy", fee: 1, wage: 1, name: alvo.name });
    await bar([alvo, outro]);
    expect(button("Adicionar ao carrinho")).toHaveAttribute("aria-pressed", "false");
    await user.click(button("Adicionar ao carrinho"));
    expect(cart()).toEqual([
      ["buy", alvo.uid, 1, 1],
      ["buy", outro.uid, 2_000_000, 10_000],
    ]);
  });

  it("sells the club's own player, and a mixed selection gets both moves with their counts", async () => {
    const user = userEvent.setup();
    await bar([alvo, nosso, outro]);
    await user.click(button("Vender (1)"));
    expect(cart()).toEqual([["sell", nosso.uid, 3_000_000, 25_000]]);
    await user.click(button("Adicionar ao carrinho (2)"));
    expect(cart().map(([kind, uid]) => [kind, uid])).toEqual([
      ["sell", nosso.uid],
      ["buy", alvo.uid],
      ["buy", outro.uid],
    ]);
  });

  it("an own-club selection offers Vender alone", async () => {
    await bar([nosso]);
    expect(button("Vender")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Adicionar ao carrinho/ })).not.toBeInTheDocument();
  });

  it("compares up to three, replacing the Comparar list and opening it; past three it says why it cannot", async () => {
    const user = userEvent.setup();
    appStore.getState().toggleCompare(999);
    await bar([alvo, outro, terceiro, quarto]);
    const compare = button("Comparar");
    expect(compare).toHaveAttribute("aria-disabled", "true");
    expect(compare).toHaveAttribute(
      "aria-description",
      "Comparar aceita até 3 jogadores: deixe 3 ou menos selecionados.",
    );
    await user.click(compare);
    expect(appStore.getState().ui.compare).toEqual([999]);
    cleanup();
    resetApp();

    await bar([alvo, outro]);
    await user.click(button("Comparar"));
    expect(appStore.getState().ui.compare).toEqual([alvo.uid, outro.uid]);
    expect(window.location.hash).toBe("#/comparar");
  });

  it("opens the profile of exactly one player", async () => {
    const user = userEvent.setup();
    await bar([alvo, outro]);
    expect(button("Abrir perfil")).toHaveAttribute("aria-disabled", "true");
    cleanup();
    resetApp();
    await bar([outro]);
    await user.click(button("Abrir perfil"));
    expect(appStore.getState().ui.selectedUid).toBe(outro.uid);
  });

  it("saves the selection in the Shortlist, or picks the folder when there are several", async () => {
    const user = userEvent.setup();
    await bar([alvo, outro]);
    await user.click(button("Shortlist"));
    expect(appStore.getState().shortlist.folders[0].uids).toEqual([alvo.uid, outro.uid]);
    expect(button("Shortlist")).toHaveAttribute("aria-pressed", "true");
    cleanup();
    resetApp();

    const laterais = appStore.getState().createFolder("Laterais")!;
    await bar([alvo, outro]);
    await user.click(button("Shortlist"));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Laterais" }));
    expect(appStore.getState().shortlist.folders.find((f) => f.id === laterais)!.uids).toEqual([alvo.uid, outro.uid]);
  });

  it("draws a page's own action among the built-in ones, in the page's order", async () => {
    const remove = vi.fn();
    const actions: readonly SelectionAction[] = [
      {
        id: "tirar",
        render: ({ players }) => (
          <button type="button" onClick={() => remove(players.length)}>
            Tirar
          </button>
        ),
      },
      "compare",
    ];
    await bar([alvo], actions);
    const names = within(screen.getByRole("toolbar"))
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(names).toEqual(["Tirar", "Comparar"]);
  });
});
