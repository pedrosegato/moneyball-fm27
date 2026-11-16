import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import type { PlayerRecord } from "@/data/types";
import { marketValue } from "@/engine/club";
import { playerRecord, snapshotOf } from "@/engine/testing/records";
import { renderWithData, resetApp, startData } from "@/shell/testing";
import { appStore } from "@/store/index";
import { fakeSource } from "@/store/testing";
import { demoPlayer, demoPlayers, ratings, worstCasePlayers } from "@/table/fixtures";
import { PlayerActions } from "./PlayerActions";
import { PlayerSheet } from "./PlayerSheet";

const MY_CLUB = 301344;

const worst = worstCasePlayers();
const players = [...demoPlayers(30), ...worst];
const snapshot = snapshotOf(players, { my_clubs: [{ name: "MFC", uid: MY_CLUB }] });

async function openPanel(table?: React.ReactNode, served = snapshot) {
  const data = startData(fakeSource(served));
  renderWithData(
    <>
      {table}
      <PlayerSheet />
    </>,
    data.controller,
  );
  await vi.waitFor(() => expect(appStore.getState().data.analysis).not.toBeNull());
  return data;
}

const select = (uid: number | null) => act(() => appStore.getState().selectPlayer(uid));

describe("PlayerSheet", () => {
  afterEach(resetApp);

  it("renders every worst-case player with no NaN, undefined, null or 0%", async () => {
    await openPanel();
    for (const player of worst) {
      select(player.uid);
      const sheet = screen.getByRole("dialog", { name: player.name });
      expect(sheet.textContent).not.toMatch(/NaN|undefined|null|Infinity/);
      expect(sheet.textContent).not.toMatch(/(^|[^\d,])0%/);
    }
  });

  it("says what is missing instead of inventing it: no club, no contract, no minutes", async () => {
    await openPanel();
    const free = worst.find((p) => p.name === "Tifany Hoyos")!;
    select(free.uid);
    const sheet = screen.getByRole("dialog", { name: free.name });
    expect(sheet).toHaveTextContent("Sem clube");
    const fact = (label: string) =>
      within(within(sheet).getByRole("list", { name: "Ficha" })).getByText(label).parentElement!;
    expect(fact("Contrato")).toHaveTextContent("—");
    expect(fact("Valor")).toHaveTextContent("—");
    expect(fact("Salário")).toHaveTextContent("—");
    expect(within(sheet).getByRole("region", { name: "Comparação" })).toHaveTextContent("Sem minutos no escopo");
    expect(within(sheet).queryByRole("list", { name: "Perfil contra a mediana" })).not.toBeInTheDocument();
  });

  const strikers = demoPlayers(30).map((p) => ({ ...p, pos: ratings("ST") }));
  const strikersOf = (club: { name: string; uid: number | null }) => snapshotOf(strikers, { my_clubs: [club] });

  it("shows Perf. as a tier chip, with the value before the league weight under it, and the league strength", async () => {
    await openPanel(undefined, strikersOf({ name: "Red Bull Bragantino", uid: strikers[0].club_uid }));
    const target = strikers[1];
    select(target.uid);
    const ficha = within(screen.getByRole("dialog", { name: target.name })).getByRole("list", { name: "Ficha" });
    const facts = within(ficha).getAllByRole("listitem");
    const labels = facts.map((li) => li.firstElementChild?.textContent);
    expect(labels).not.toContain("Perf. aj.");
    const perf = facts[labels.indexOf("Perf.")];
    const shown = (fact: HTMLElement) => fact.querySelector('[data-slot="stat-cell"] [aria-hidden]')?.textContent;
    expect(perf.querySelector('[data-slot="stat-cell"]')).toHaveAttribute("data-tier");
    expect(shown(perf)).toMatch(/^\d+$/);
    const strength = facts[labels.indexOf("Força da liga")];
    expect(strength.lastElementChild?.textContent).toMatch(/^\d+$/);
    expect(strength.getAttribute("title")).toMatch(
      /^CA média dos titulares da liga \(450\+ min\), estimada pelo save; a da sua liga: \d+$/,
    );
  });

  it("says the comparison is against the player's own position with the pool's minutes, its chips too", async () => {
    const keeper = demoPlayer(80, { name: "Goleiro Titular", pos: ratings("GK") });
    await openPanel(undefined, snapshotOf([...strikers, keeper], { my_clubs: [{ name: "MFC", uid: MY_CLUB }] }));
    select(strikers[0].uid);
    const sheet = screen.getByRole("dialog", { name: strikers[0].name });
    expect(within(sheet).getByRole("region", { name: "Comparação" })).toHaveTextContent(
      "Contra os atacantes com 300+ min",
    );
    const top = within(sheet).getByRole("list", { name: "Top 10 stats" });
    expect(within(top).getAllByText(/, percentil \d+ contra os atacantes com 300\+ min$/).length).toBeGreaterThan(0);
    select(keeper.uid);
    const keeperSheet = screen.getByRole("dialog", { name: keeper.name });
    expect(within(keeperSheet).getByRole("region", { name: "Comparação" })).toHaveTextContent(
      "Contra os goleiros com 300+ min",
    );
    expect(sheet.textContent).not.toMatch(/Comparando com|na comparação/);
  });

  it("shows Perf. and Valor justo as — with amostra pequena for a player under the pool", async () => {
    const many = demoPlayers(60).map((p) => ({ ...p, pos: ratings("ST") }));
    const benched = demoPlayer(90, {
      name: "Poucos Minutos",
      pos: ratings("ST"),
      minutes: 200,
      club: many[0].club,
      club_uid: many[0].club_uid,
    });
    await openPanel(
      undefined,
      snapshotOf([...many, benched], { my_clubs: [{ name: many[0].club!, uid: many[0].club_uid }] }),
    );
    const { analysis } = appStore.getState().data;
    const at = analysis!.uids.indexOf(benched.uid);
    expect(analysis!.pool[at]).toBe(0);
    expect([analysis!.perf[at], analysis!.fair[at]].every(Number.isFinite)).toBe(true);

    select(benched.uid);
    const ficha = within(screen.getByRole("dialog", { name: benched.name })).getByRole("list", { name: "Ficha" });
    for (const label of ["Perf.", "Valor justo"]) {
      const fact = within(ficha).getByText(label, { selector: "span.type-caption" }).parentElement!;
      expect(fact.querySelector("[aria-hidden='true']")).toHaveTextContent("—");
      expect(fact.querySelector(".sr-only")).toHaveTextContent(`${label}: amostra pequena`);
    }
    select(many[1].uid);
    const kept = within(screen.getByRole("dialog", { name: many[1].name })).getByRole("list", { name: "Ficha" });
    const perf = within(kept).getByText("Perf.", { selector: "span.type-caption" }).parentElement!;
    expect(perf.querySelector('[data-slot="stat-cell"] [aria-hidden]')?.textContent).toMatch(/^\d+$/);
  });

  it("explains each stat's name in the lists with the same tooltip as the table's header", async () => {
    const user = userEvent.setup();
    await openPanel(undefined, strikersOf({ name: "MFC", uid: MY_CLUB }));
    select(strikers[0].uid);
    const sheet = screen.getByRole("dialog", { name: strikers[0].name });
    const top = within(sheet).getByRole("list", { name: "Top 10 stats" });
    const first = within(top).getAllByRole("listitem")[0];
    await user.hover(first.querySelector<HTMLElement>("[data-stat-name]")!);
    await vi.waitFor(() => expect(document.querySelector("[data-slot=tooltip-content]")).not.toBeNull(), {
      timeout: 2000,
    });
    expect(document.querySelector("[data-slot=tooltip-content]")!.textContent).toMatch(
      /^.+ — .+(menos|mais|melhor|trabalho|mérito)/,
    );
  });

  it("shows no line about the league weight when the club's league has no strength to adjust to", async () => {
    await openPanel(undefined, strikersOf({ name: "MFC", uid: MY_CLUB }));
    select(strikers[1].uid);
    const ficha = within(screen.getByRole("dialog", { name: strikers[1].name })).getByRole("list", { name: "Ficha" });
    expect(within(ficha).queryByText(/sem o peso da liga/)).not.toBeInTheDocument();
    const perf = within(ficha).getByText("Perf.").parentElement!;
    expect(perf.querySelector('[data-slot="stat-cell"] [aria-hidden]')?.textContent).toMatch(/^\d+$/);
  });

  it("swaps the player in place when another row is chosen, and closes from its own button", async () => {
    await openPanel();
    const [first, second] = players;
    select(first.uid);
    const sheet = screen.getByRole("dialog", { name: first.name });
    select(second.uid);
    expect(screen.getByRole("dialog", { name: second.name })).toBe(sheet);
    expect(sheet).not.toHaveAttribute("data-starting-style");

    await userEvent.click(within(sheet).getByRole("button", { name: "Fechar" }));
    expect(appStore.getState().ui.selectedUid).toBeNull();
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("adds a purchase at the market value and current wage, and takes it out again", async () => {
    await openPanel();
    const target = players[3];
    select(target.uid);
    const cart = screen.getByRole("button", { name: "Carrinho" });
    await userEvent.click(cart);
    expect(appStore.getState().cart.items).toEqual([
      { uid: target.uid, kind: "buy", fee: target.value, wage: target.wage, name: target.name },
    ]);
    expect(cart).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(cart);
    expect(appStore.getState().cart.items).toEqual([]);
  });

  it("keeps Comparar to three players and says why a fourth stays out", async () => {
    await openPanel();
    for (const p of players.slice(0, 3)) act(() => appStore.getState().toggleCompare(p.uid));
    select(players[4].uid);
    const said = vi.spyOn(toast, "info");
    const compare = screen.getByRole("button", { name: "Comparar" });
    await userEvent.click(compare);
    expect(appStore.getState().ui.compare).toEqual(players.slice(0, 3).map((p) => p.uid));
    expect(compare).toHaveAttribute("aria-pressed", "false");
    expect(said).toHaveBeenCalledWith(expect.stringContaining("Comparar já tem 3 jogadores"), { id: "compare-full" });
    said.mockRestore();
  });

  it("closes when a reload no longer has the player, handing the focus back to the table", async () => {
    const gone = players[5];
    const tabStop = players[6];
    const table = (
      <table>
        <tbody>
          <tr data-player={tabStop.uid} tabIndex={0}>
            <td>{tabStop.name}</td>
          </tr>
        </tbody>
      </table>
    );
    const { source, controller } = await openPanel(table);
    const before = appStore.getState().data.analysis;
    select(gone.uid);
    act(() => screen.getByRole("dialog", { name: gone.name }).focus());

    source.loadPlayers.mockResolvedValue(
      snapshotOf(
        players.filter((p) => p !== gone),
        { my_clubs: snapshot.my_clubs },
      ),
    );
    await act(() => controller.reload());
    await vi.waitFor(() => expect(appStore.getState().data.analysis).not.toBe(before));

    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(appStore.getState().ui.selectedUid).toBeNull();
    expect(screen.getByRole("row", { name: tabStop.name })).toHaveFocus();
  });
});

describe("PlayerActions", () => {
  afterEach(resetApp);

  const actionsFor = (player: PlayerRecord) => render(<PlayerActions player={player} myClubUid={MY_CLUB} />);

  it("sells a player under contract with the club at his market value and wage, and takes the sale back", async () => {
    const own = playerRecord({
      name: "Do Elenco",
      club: "MFC",
      club_uid: MY_CLUB,
      owner: null,
      owner_uid: null,
      value: 3_500_000,
      wage: 7_294,
    });
    actionsFor(own);
    const sell = screen.getByRole("button", { name: "Vender" });
    expect(screen.queryByRole("button", { name: "Carrinho" })).not.toBeInTheDocument();

    await userEvent.click(sell);
    expect(appStore.getState().cart.items).toEqual([
      { uid: own.uid, kind: "sell", fee: marketValue(own), wage: 7_294, name: "Do Elenco" },
    ]);
    expect(sell).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(sell);
    expect(appStore.getState().cart.items).toEqual([]);
  });

  it("sells a player the club loaned out, who is still under contract with it", () => {
    actionsFor(playerRecord({ club: "Outro", club_uid: 555, owner: "MFC", owner_uid: MY_CLUB }));
    expect(screen.getByRole("button", { name: "Vender" })).toBeInTheDocument();
  });

  it("buys a player on loan at the club, who belongs to someone else", () => {
    actionsFor(playerRecord({ club: "MFC", club_uid: MY_CLUB, owner: "Dono", owner_uid: 777 }));
    expect(screen.getByRole("button", { name: "Carrinho" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Vender" })).not.toBeInTheDocument();
  });

  describe("Funções", () => {
    const defenders = demoPlayers(60).map((p) => ({ ...p, pos: ratings("DC") }));
    const defendersOf = (extra: PlayerRecord[] = []) =>
      snapshotOf([...defenders, ...extra], { my_clubs: [{ name: defenders[0].club!, uid: defenders[0].club_uid }] });

    it("lists up to 3 roles with and without the ball, best first", async () => {
      await openPanel(undefined, defendersOf());
      const target = defenders[1];
      select(target.uid);
      const sheet = screen.getByRole("dialog", { name: target.name });
      const section = within(sheet).getByRole("region", { name: "Funções" });
      for (const phase of ["Com bola", "Sem bola"]) {
        const rows = within(within(section).getByRole("list", { name: phase })).getAllByRole("listitem");
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.length).toBeLessThanOrEqual(3);
        const scores = rows.map((row) => {
          const cell = row.querySelector('[data-slot="stat-cell"]')!;
          expect(cell).toHaveAttribute("data-tier");
          return Number(cell.querySelector("[aria-hidden]")?.textContent);
        });
        expect(scores).toEqual([...scores].sort((a, b) => b - a));
      }
    });

    it("a player under the pool minutes sees the roles hidden under the pool", async () => {
      const benched = demoPlayer(90, {
        name: "Poucos Minutos",
        pos: ratings("DC"),
        minutes: 200,
        club: defenders[0].club,
        club_uid: defenders[0].club_uid,
      });
      await openPanel(undefined, defendersOf([benched]));
      select(benched.uid);
      const section = within(screen.getByRole("dialog", { name: benched.name })).getByRole("region", {
        name: "Funções",
      });
      const rows = within(within(section).getByRole("list", { name: "Com bola" })).getAllByRole("listitem");
      expect(rows[0].querySelector("[aria-hidden='true']")).toHaveTextContent("—");
      expect(rows[0].querySelector(".sr-only")).toHaveTextContent("amostra pequena");
      expect(section.querySelector('[data-slot="stat-cell"]')).toBeNull();
    });

    it("a player without minutes reads the empty text", async () => {
      await openPanel();
      const free = worst.find((p) => p.name === "Tifany Hoyos")!;
      select(free.uid);
      const section = within(screen.getByRole("dialog", { name: free.name })).getByRole("region", {
        name: "Funções",
      });
      expect(section).toHaveTextContent("Sem nota em nenhuma função das posições dele.");
    });
  });
});
