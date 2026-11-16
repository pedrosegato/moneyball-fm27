import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PlayerRecord } from "@/data/types";
import { snapshotOf } from "@/engine/testing/records";
import { renderWithData, resetApp, startData } from "@/shell/testing";
import { appStore } from "@/store/index";
import { fakeSource } from "@/store/testing";
import { demoPlayer, demoPlayers, worstCasePlayers } from "@/table/fixtures";
import { Shortlist } from "./Shortlist";

const MY = 301344;
const ours = demoPlayer(1, { name: "Nosso Lateral", club: "MFC", club_uid: MY });
const [longName, korean] = worstCasePlayers();
const target = demoPlayer(2, { name: "Alvo Barato", club: "Viking", club_uid: 50 });
const snapshot = snapshotOf([ours, longName, korean, target, ...demoPlayers(30).slice(10)], {
  my_clubs: [{ name: "MFC", uid: MY }],
  date: "2026-11-11",
});

const table = () => screen.getByRole("table", { name: "Jogadores" });
const rowOf = (p: PlayerRecord) => table().querySelector<HTMLElement>(`tr[data-player="${p.uid}"]`);
const status = () => within(screen.getByRole("region", { name: "Tabela de jogadores" })).getByRole("status");
const folders = () => screen.getByRole("navigation", { name: "Pastas" });
const bar = () => screen.getByRole("toolbar", { name: "Seleção" });
const select = (user: ReturnType<typeof userEvent.setup>, p: PlayerRecord) =>
  user.click(within(rowOf(p)!).getByRole("checkbox"));

async function openShortlist(uids: number[]) {
  for (const uid of uids) appStore.getState().toggleShortlist(uid);
  const { controller } = startData(fakeSource(snapshot));
  renderWithData(<Shortlist />, controller);
  await vi.waitFor(() => expect(status()).toHaveTextContent(/jogador/));
}

describe("Shortlist", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(2000);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1400);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetApp();
  });

  it("lists the folder's players in the table, worst-case names included", async () => {
    await openShortlist([target.uid, longName.uid, korean.uid]);
    expect(status()).toHaveTextContent("3 jogadores");
    expect(within(folders()).getByRole("button", { name: "Shortlist, 3 jogadores" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    for (const p of [target, longName, korean]) expect(rowOf(p)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("creates a folder, moves a player into it and renames it", async () => {
    const user = userEvent.setup();
    await openShortlist([target.uid, korean.uid]);
    await user.click(screen.getByRole("button", { name: "Nova pasta" }));
    await user.type(screen.getByRole("textbox", { name: "Nome da nova pasta" }), "Laterais{Enter}");
    expect(within(folders()).getByRole("button", { name: "Laterais, nenhum jogador" })).toBeInTheDocument();

    await user.click(within(folders()).getByRole("button", { name: "Shortlist, 2 jogadores" }));
    await select(user, korean);
    await user.click(within(bar()).getByRole("button", { name: "Mover para pasta" }));
    await user.click(await screen.findByRole("menuitem", { name: "Laterais" }));
    expect(status()).toHaveTextContent("1 jogador");
    expect(appStore.getState().shortlist.folders[1].uids).toEqual([korean.uid]);

    await user.click(within(folders()).getByRole("button", { name: "Ações da pasta Laterais" }));
    await user.click(await screen.findByRole("menuitem", { name: "Renomear" }));
    const name = screen.getByRole("textbox", { name: "Novo nome da pasta Laterais" });
    await user.clear(name);
    await user.type(name, "Zagueiros{Enter}");
    expect(within(folders()).getByRole("button", { name: "Zagueiros, 1 jogador" })).toBeInTheDocument();
  });

  it("asks before deleting a folder with players, and keeps the last folder", async () => {
    const user = userEvent.setup();
    const laterais = appStore.getState().createFolder("Laterais")!;
    appStore.getState().toggleShortlist(korean.uid, laterais);
    await openShortlist([target.uid]);
    await user.click(within(folders()).getByRole("button", { name: "Ações da pasta Laterais" }));
    await user.click(await screen.findByRole("menuitem", { name: "Excluir" }));
    const dialog = await screen.findByRole("dialog", { name: "Excluir a pasta Laterais?" });
    await user.click(within(dialog).getByRole("button", { name: "Excluir pasta" }));
    expect(appStore.getState().shortlist.folders.map((f) => f.name)).toEqual(["Shortlist"]);

    await user.click(within(folders()).getByRole("button", { name: "Ações da pasta Shortlist" }));
    expect(await screen.findByRole("menuitem", { name: "Excluir" })).toHaveAttribute("aria-disabled", "true");
  });

  it("names the players missing from the save and takes them out", async () => {
    const user = userEvent.setup();
    await openShortlist([target.uid, 999_001, 999_002]);
    const note = screen.getByRole("status", { name: "Fora do save" });
    expect(note).toHaveTextContent("2 jogadores desta pasta não estão no save lido");
    await user.click(within(note).getByRole("button", { name: "Tirar da pasta" }));
    expect(appStore.getState().shortlist.folders[0].uids).toEqual([target.uid]);
    expect(screen.queryByRole("status", { name: "Fora do save" })).not.toBeInTheDocument();
  });

  it("puts a target in the cart as a purchase and one of the club's as a sale, from the selection's bar", async () => {
    const user = userEvent.setup();
    await openShortlist([target.uid, ours.uid]);
    expect(within(table()).queryByRole("button", { name: /^(Carrinho|Vender) / })).not.toBeInTheDocument();
    await select(user, target);
    await select(user, ours);
    await user.click(within(bar()).getByRole("button", { name: "Adicionar ao carrinho (1)" }));
    await user.click(within(bar()).getByRole("button", { name: "Vender (1)" }));
    expect(appStore.getState().cart.items.map((i) => [i.uid, i.kind])).toEqual([
      [target.uid, "buy"],
      [ours.uid, "sell"],
    ]);
  });

  it("takes the selected players out of the folder", async () => {
    const user = userEvent.setup();
    await openShortlist([target.uid, korean.uid]);
    await select(user, korean);
    await user.click(within(bar()).getByRole("button", { name: "Tirar da pasta" }));
    expect(status()).toHaveTextContent("1 jogador");
    expect(appStore.getState().shortlist.folders[0].uids).toEqual([target.uid]);
  });

  it("starts each folder with nothing selected", async () => {
    const user = userEvent.setup();
    const laterais = appStore.getState().createFolder("Laterais")!;
    appStore.getState().toggleShortlist(korean.uid, laterais);
    await openShortlist([target.uid]);
    await select(user, target);
    await user.click(within(folders()).getByRole("button", { name: "Laterais, 1 jogador" }));
    expect(screen.queryByRole("toolbar", { name: "Seleção" })).not.toBeInTheDocument();
  });
});
