import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PlayerRecord } from "@/data/types";
import { squadRolePerf } from "@/engine/analysis/squadRoles";
import { createEngineClient } from "@/engine/client";
import { ATTRIBUTE_NAMES } from "@/engine/data/attributes";
import { ROLES, type RoleId, roleById, roleIndex } from "@/engine/roles/catalog";
import { createEngineSession, type EngineResponse } from "@/engine/session";
import { rolesFor, shapeFromFormation } from "@/engine/tacticShape";
import { type RecordParts, snapshotOf } from "@/engine/testing/records";
import { sampleTactic } from "@/engine/testing/tactic";
import { renderWithData, resetApp, startData } from "@/shell/testing";
import { appStore } from "@/store/index";
import { fakeSource } from "@/store/testing";
import { demoPlayer, demoPlayers, ratings, worstCasePlayers } from "@/table/fixtures";
import { Elenco } from "./Elenco";
import { slotName } from "./elenco/lib/slots";

const MY = 301344;
const ours = (p: PlayerRecord): PlayerRecord => ({ ...p, club: "MFC", club_uid: MY, division: "Série A" });

const attrs = (k: number) => Array.from({ length: ATTRIBUTE_NAMES.length }, (_, a) => 5 * (6 + ((k * 7 + a) % 14)));
const striker = (k: number, parts: RecordParts = {}) =>
  demoPlayer(k, { pos: ratings("ST"), attrs: attrs(k), ...parts });
const centreBack = (k: number, parts: RecordParts = {}) =>
  demoPlayer(k, { pos: ratings("DC"), position: "D (C)", attrs: attrs(k), ...parts });
const mine = [
  ours(striker(1, { name: "João Henrique Gonçalves de Albuquerque Júnior", minutes: 3000, squad_number: 9 })),
  ours(striker(2, { name: "Reserva", minutes: 400, squad_number: 2 })),
  ours(centreBack(3, { name: "Zagueiro Titular", minutes: 2500, squad_number: 4 })),
  ours(centreBack(4, { name: "Zagueiro Parceiro", minutes: 1800, squad_number: 3 })),
];
const world = [...Array.from({ length: 40 }, (_, k) => striker(10 + k)), ...worstCasePlayers()];
const snapshot = snapshotOf([...mine, ...world], { my_clubs: [{ name: "MFC", uid: MY }] });
const recem = ours(striker(5, { name: "Recém-Chegado", minutes: 200, squad_number: 11 }));
const gameTactic = sampleTactic(
  [null, 424242, mine[2].uid, mine[3].uid, null, null, null, null, null, recem.uid, mine[0].uid],
  [mine[1].uid],
);
const tacticSnapshot = snapshotOf([...mine, recem, ...world], {
  my_clubs: [{ name: "MFC", uid: MY }],
  tactic: gameTactic,
});

const table = () => screen.getByRole("table", { name: "Jogadores" });
const rowOf = (p: PlayerRecord) => table().querySelector<HTMLElement>(`tr[data-player="${p.uid}"]`)!;
const inSquad = (p: PlayerRecord): PlayerRecord => ({ ...p, club: "MFC", club_uid: MY, team: "Senior Team" });
const worst = worstCasePlayers().map(inSquad);
const loanedOut = demoPlayer(120, {
  name: "Kauã Emprestado",
  club: "Brighton & Hove Albion Football Club",
  club_uid: 77,
  team: "Senior Team",
  owner: "MFC",
  owner_uid: MY,
  owner_team: "U20",
});
const loanedIn = demoPlayer(121, {
  name: "Chegou de Empréstimo",
  club: "MFC",
  club_uid: MY,
  owner: "Flamengo",
  owner_uid: 9,
  owner_team: "U21",
  team: "Senior Team",
});
const keeper = inSquad(demoPlayer(122, { name: "Goleiro Titular", pos: ratings("GK"), position: "GK" }));
const squad = [...demoPlayers(12).map(inSquad), ...worst, loanedOut, loanedIn, keeper];
const squadSnapshot = snapshotOf([...squad, ...demoPlayers(40).slice(20)], {
  my_clubs: [{ name: "MFC", uid: MY }],
  date: "2026-11-11",
});

const pitch = () => screen.getByRole("radiogroup", { name: "Posições do XI" });
const card = (name: RegExp) => within(pitch()).getByRole("radio", { name });
const status = () => within(screen.getByRole("region", { name: "Tabela de jogadores" })).getByRole("status");
const picks = () => appStore.getState().fit.lineups[String(MY)]?.picks;
const strikerSlot = () => appStore.getState().data.analysis!.lineup.slots.indexOf("ST(C)");
const rolesOn = (el: HTMLElement) => [...el.querySelectorAll("[data-role]")].map((r) => r.getAttribute("data-role"));
const needsLine = () => screen.getByRole("group", { name: "Onde o time precisa" });
const chooseView = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(within(screen.getByRole("radiogroup", { name: "Visão do campo" })).getByRole("radio", { name }));

function heldEngine() {
  const session = createEngineSession();
  let respond: (response: EngineResponse) => void = () => {};
  let held = false;
  const waiting: (() => void)[] = [];
  const client = createEngineClient({
    post: (request) => {
      const answer = () => respond(session.handle(request).response);
      if (held) waiting.push(answer);
      else queueMicrotask(answer);
    },
    listen: (onResponse) => {
      respond = onResponse;
    },
    terminate: () => {},
  });
  const hold = () => {
    held = true;
  };
  const release = () => {
    held = false;
    for (const answer of waiting.splice(0)) answer();
  };
  return { client, hold, release };
}

async function openSignings(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("tab", { name: /^Contratações/ }));
}

async function openSquad() {
  const { controller } = startData(fakeSource(squadSnapshot));
  renderWithData(<Elenco />, controller);
  await vi.waitFor(() => expect(status()).toHaveTextContent(`${squad.length} jogadores`));
}

async function openElenco() {
  const { controller } = startData(fakeSource(snapshot));
  renderWithData(<Elenco />, controller);
  await vi.waitFor(() => expect(within(pitch()).getAllByRole("radio")).toHaveLength(11));
}

async function openTactic() {
  const { controller } = startData(fakeSource(tacticSnapshot));
  renderWithData(<Elenco />, controller);
  await vi.waitFor(() => expect(within(pitch()).getAllByRole("radio")).toHaveLength(11));
}

describe("Elenco", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(2000);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1400);
  });
  afterEach(() => {
    fireEvent.keyDown(document, { code: "Escape", key: "Escape" });
    vi.restoreAllMocks();
    resetApp();
  });

  it("fills the XI by minutes and draws it upright, attack on top", async () => {
    await openElenco();
    expect(card(/^Atacante \(ST\): João Henrique/)).toBeInTheDocument();
    expect(
      within(pitch()).getAllByRole("radio", { name: /^Zagueiro \(DC\): Zagueiro (Titular|Parceiro)/ }),
    ).toHaveLength(2);
    expect(card(/^Goleiro \(GK\): vazio/)).toBeChecked();

    const radios = within(pitch()).getAllByRole("radio");
    expect(radios[0]).toHaveAccessibleName(/^Atacante \(ST\)/);
    expect(radios.at(-1)).toHaveAccessibleName(/^Goleiro \(GK\)/);
    const spot = (name: RegExp) => card(name).dataset.spot;
    expect(spot(/^Atacante \(ST\)/)).toBe("1,3");
    expect(spot(/^Goleiro \(GK\)/)).toBe("6,3");
    expect(spot(/^Lateral esquerdo \(DL\)/)).toBe("5,1");
    expect(spot(/^Lateral direito \(DR\)/)).toBe("5,5");
  });

  it("opens on the game's tactic: its XI, shirt numbers and roles", async () => {
    await openTactic();
    const st = card(/^Atacante \(ST\): João Henrique/);
    expect(st.querySelector('[data-slot="shirt-number"]')).toHaveTextContent(/^9$/);
    expect(card(/^Zagueiro \(DC\): Zagueiro Parceiro/).querySelector('[data-slot="shirt-number"]')).toHaveTextContent(
      /^3$/,
    );
    expect(st).toHaveTextContent("AC");
    expect(rolesOn(st)).toEqual(["ip:11"]);
    expect(card(/^Zagueiro \(DC\): Zagueiro Parceiro/).querySelector('[data-role="ip:1"]')).toHaveTextContent("DC");
    expect(screen.getByText("Tática do jogo")).toBeInTheDocument();
    expect(screen.getByText(gameTactic.name)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Formação/ })).not.toBeInTheDocument();
    expect(document.querySelectorAll("[data-free-spot]")).toHaveLength(13);
    expect(within(pitch()).getAllByRole("radio")).toHaveLength(11);
  });

  it("a starter the read did not bring is an empty slot", async () => {
    await openTactic();
    expect(card(/^Lateral direito \(DR\): vazio/)).toBeInTheDocument();
    const items = within(needsLine()).getAllByRole("button");
    expect(items[0]).toHaveTextContent("Goleiro vazia");
    expect(items[1]).toHaveTextContent("Lateral direito vazia");
  });

  it("a starter under the pool has no score and goes to Sem dados", async () => {
    await openTactic();
    const amr = card(/^Ponta direita \(AMR\): Recém-Chegado/);
    expect(amr.querySelector('[data-slot="stat-cell"]')).toHaveTextContent("—");
    expect(amr).toHaveTextContent("Menos de 300 min na temporada: sem nota");
    expect(needsLine()).toHaveTextContent("Ponta direita (200 min)");
  });

  it("Sem Posse de Bola puts each card on its out-of-possession spot with that role", async () => {
    const user = userEvent.setup();
    await openTactic();
    await chooseView(user, "Sem Posse de Bola");
    expect(card(/^Volante \(DM\)/).dataset.spot).toBe("4,3");
    expect(rolesOn(card(/^Atacante \(ST\)/))).toEqual(["oop:44"]);
    expect(appStore.getState().ui.pitchView).toBe("semPosse");
  });

  it("Ambos shows both roles on a card and links the cards that change place", async () => {
    const user = userEvent.setup();
    await openTactic();
    await chooseView(user, "Ambos");
    expect(rolesOn(card(/^Atacante \(ST\)/))).toEqual(["ip:11", "oop:44"]);
    expect(card(/^Ponta direita \(AMR\)/)).toHaveAccessibleName(
      /^Ponta direita \(AMR\): Recém-Chegado, com bola Extremo sem nota, sem bola .+ sem nota em Meia direita \(MR\)$/,
    );
    expect(document.querySelectorAll("[data-shape-link]")).toHaveLength(5);
  });

  it("Panorâmico shows both shapes side by side, for reading", async () => {
    const user = userEvent.setup();
    await openTactic();
    await chooseView(user, "Panorâmico");
    const withBall = screen.getByRole("radiogroup", { name: "Posições do XI com bola" });
    const withoutBall = screen.getByRole("radiogroup", { name: "Posições do XI sem bola" });
    expect(within(withBall).getAllByRole("radio")).toHaveLength(11);
    expect(within(withoutBall).getAllByRole("radio")).toHaveLength(11);
    expect(screen.queryByRole("button", { name: /^Mover / })).not.toBeInTheDocument();
    expect(document.querySelector("[data-free-spot]")).toBeNull();
    const overviewStriker = within(withoutBall).getByRole("radio", { name: /^Atacante \(ST\)/ });
    expect(overviewStriker.querySelector('[data-slot="player-name"]')).toHaveTextContent(/^Júnior$/);
    await user.click(overviewStriker);
    expect(within(withBall).getByRole("radio", { name: /^Atacante \(ST\)/ })).toBeChecked();
  });

  it("names an edit of the game's tactic, says when the game changed it, and goes back to it", async () => {
    const user = userEvent.setup();
    await openTactic();
    await user.click(card(/^Atacante \(ST\)/));
    await user.click(screen.getByRole("button", { name: "Limpar vaga" }));
    expect(screen.getByText("Editada aqui")).toBeInTheDocument();
    expect(screen.getByText(gameTactic.name)).toBeInTheDocument();
    expect(screen.queryByText("A tática do jogo mudou")).not.toBeInTheDocument();

    const { shape } = appStore.getState().fit.lineups[String(MY)];
    appStore.getState().editLineup(MY, { ...shape!, base: "an older read" }, picks()!);
    expect(await screen.findByText("A tática do jogo mudou")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Voltar à tática do jogo" }));
    expect(appStore.getState().fit.lineups[String(MY)].shape).toBeUndefined();
    expect(screen.getByText("Tática do jogo")).toBeInTheDocument();
    await vi.waitFor(() => expect(card(/^Atacante \(ST\): João Henrique/)).toBeInTheDocument());
  });

  it("an edit of a tactic the game no longer has is named as the edit, not as a formation", async () => {
    appStore
      .getState()
      .editLineup(MY, { base: "a read from before", name: "Minha tática", slots: shapeFromFormation("4-4-2") }, {});
    await openElenco();
    expect(screen.getByText("Editada aqui")).toBeInTheDocument();
    expect(screen.getByText("Minha tática")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Formação/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Automático" })).toBeInTheDocument();
    expect(screen.getByText("Sem tática do jogo")).toBeInTheDocument();
  });

  it("picks another role for the slot in the head; the card follows and the bar offers the way back", async () => {
    const user = userEvent.setup();
    await openTactic();
    const partner = () => card(/^Zagueiro \(DC\): Zagueiro Parceiro/);
    await user.click(partner());
    await user.click(screen.getByRole("button", { name: "Função com bola: Defesa Central. Trocar" }));
    const menu = await screen.findByRole("group", { name: "Funções de Zagueiro (DC) com bola" });
    expect(within(menu).getAllByRole("menuitemradio")).toHaveLength(6);
    await user.click(within(menu).getByRole("menuitemradio", { name: /^Central Pragmático/ }));

    expect(partner().querySelector('[data-role="ip:29"]')).not.toBeNull();
    expect(appStore.getState().fit.lineups[String(MY)].shape?.slots[3].ip.roleId).toBe("ip:29");
    expect(screen.getByRole("button", { name: "Função com bola: Central Pragmático. Trocar" })).toBeInTheDocument();
    expect(screen.getByText("Editada aqui")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Voltar à tática do jogo" }));
    expect(partner().querySelector('[data-role="ip:1"]')).not.toBeNull();
    expect(appStore.getState().fit.lineups[String(MY)].shape).toBeUndefined();
  });

  it("the role menu lists the position's roles, the player's best first", async () => {
    const user = userEvent.setup();
    await openTactic();
    const { data } = appStore.getState();
    const { squadRoles } = data.analysis!;
    const striker = squadRoles.players.indexOf(tacticSnapshot.players.findIndex((p) => p.uid === mine[0].uid));
    const perf = Float32Array.from(squadRoles.perf);
    const scores: [RoleId, number][] = [
      ["ip:10", 30],
      ["ip:11", 80],
      ["ip:18", NaN],
      ["ip:19", 55],
      ["ip:31", 91],
    ];
    for (const [id, value] of scores) perf[striker * ROLES.length + roleIndex(id)] = value;
    appStore.setState({ data: { ...data, analysis: { ...data.analysis!, squadRoles: { ...squadRoles, perf } } } });

    await user.click(card(/^Atacante \(ST\)/));
    await user.click(screen.getByRole("button", { name: /^Função com bola: / }));
    const menu = await screen.findByRole("group", { name: "Funções de Atacante (ST) com bola" });
    const names = within(menu)
      .getAllByRole("menuitemradio")
      .map((item) => item.querySelector('[data-slot="role-name"]')?.textContent);

    const rank = squadRolePerf(appStore.getState().data.analysis!.squadRoles);
    const index = tacticSnapshot.players.findIndex((p) => p.uid === mine[0].uid);
    const scored = rolesFor("ST", "ip").filter((r) => Number.isFinite(rank(index, r.id)));
    const best = scored.sort((a, b) => rank(index, b.id) - rank(index, a.id)).map((r) => r.name);
    expect(names).toEqual([...best, roleById("ip:18")!.name]);
    expect(names.slice(0, 3)).toEqual(["Avançado Ataca-Espaços", "Avançado", "Avançado de Área"]);
  });

  it("Escalado says Suplente for the game's bench", async () => {
    await openTactic();
    expect(rowOf(mine[1]).querySelector('[data-column-id="xiSlot"]')).toHaveTextContent("Suplente");
    expect(rowOf(mine[0]).querySelector('[data-column-id="xiSlot"]')).toHaveTextContent("ST");
  });

  it("shows on each card the slot, who plays it and his Perf. there as a tier chip", async () => {
    await openElenco();
    const st = card(/^Atacante \(ST\)/);
    expect(st.querySelector('[data-role="ip:11"]')).toHaveTextContent("AC");
    expect(st.querySelector('[data-slot="player-name"]')).toHaveTextContent(/^Júnior$/);
    expect(st).not.toHaveTextContent(mine[0].name!);
    expect(st).toHaveAccessibleName(expect.stringContaining(`: ${mine[0].name}`));
    expect(st.getAttribute("title")).toContain(mine[0].name!);
    expect(st.querySelector('[data-slot="stat-cell"]')).toHaveAttribute("data-tier");
    expect(screen.getByText("Sem tática do jogo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Formação: 4-3-3" })).toBeInTheDocument();
    const keeper = card(/^Goleiro \(GK\)/);
    expect(keeper).toHaveTextContent("Vazio");
    const empty = keeper.querySelector('[data-slot="stat-cell"]')!;
    expect(empty).not.toHaveAttribute("data-tier");
    expect(empty).toHaveTextContent("—");
  });

  it("picking a slot names it in the head and lists its candidates in Contratações", async () => {
    const user = userEvent.setup();
    await openElenco();
    await user.click(card(/^Atacante \(ST\)/));
    await openSignings(user);
    expect(screen.getByRole("heading", { level: 2, name: "Atacante (ST)" })).toBeInTheDocument();
    const head = screen.getByRole("group", { name: "Vaga escolhida" });
    expect(head).toHaveTextContent(mine[0].name!);
    expect(head).not.toHaveTextContent(/Perf\. vaga/);
    expect(within(head).getByRole("button", { name: /^Função com bola: .*\. Trocar$/ })).toBeInTheDocument();
    expect(within(head).getByRole("button", { name: "Limpar vaga" })).toBeInTheDocument();

    const analysis = appStore.getState().data.analysis!;
    const rows = analysis.fit[strikerSlot()];
    expect(rows.length).toBeGreaterThan(5);
    expect(screen.getByRole("tab", { name: `Contratações ${rows.length}` })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName(`Contratações ${rows.length}`);
    expect(status()).toHaveTextContent(`${rows.length} jogadores`);
    const counts = (v: string) => rows.filter((r) => r.verdict === v).length;
    const verdicts = screen.getByRole("radiogroup", { name: "Veredito" });
    expect(within(verdicts).getByRole("radio", { name: `Melhor ${counts("upgrade")}` })).toBeInTheDocument();
    expect(within(verdicts).getByRole("radio", { name: `Equivalente ${counts("replacement")}` })).toBeInTheDocument();
    expect(within(verdicts).getByRole("radio", { name: `Pior ${counts("downgrade")}` })).toBeInTheDocument();
    expect(screen.getByRole("main").textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("Meu elenco lists the squad by Performance in the slot, with team and verdict filters", async () => {
    const user = userEvent.setup();
    await openSquad();
    expect(screen.getByRole("tab", { name: /^Meu elenco/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName(`Meu elenco ${squad.length}`);
    const main = screen.getByRole("main");
    expect(main.textContent).not.toMatch(/NaN|undefined|null|Infinity/);
    expect(main.textContent).not.toMatch(/(^|[^\d,])0%/);
    const contracted = squad.filter((p) => p !== loanedIn);
    for (const p of contracted)
      expect(within(rowOf(p)).getByText(/./, { selector: '[data-slot="verdict"]' })).toBeInTheDocument();
    expect(within(table()).queryByRole("button", { name: /^Vender/ })).not.toBeInTheDocument();
    expect(rowOf(loanedIn).querySelector('[data-column-id="sellKeep"]')).toHaveTextContent("—");
    expect(within(rowOf(loanedIn)).getByText("Emprestado por Flamengo")).toBeInTheDocument();
    expect(within(rowOf(loanedOut)).getByText("Emprestado a Brighton & Hove Albion Football Club")).toBeInTheDocument();
    const unplayed = worst.find((p) => p.name === "Tifany Hoyos")!;
    expect(rowOf(unplayed).querySelector('[data-column-id="sellKeep"]')?.textContent).toMatch(/min/);

    expect(rowOf(keeper).querySelector('[data-column-id="perf"]')).not.toBeNull();
    expect(rowOf(keeper).querySelector('[data-column-id="slotPerf"]')).toBeNull();
    expect(rowOf(keeper).querySelector('[data-column-id="perfRole"]')).toBeNull();
    expect(rowOf(keeper).querySelector('[data-column-id="xiSlot"]')).toHaveTextContent("GK");

    const teams = screen.getByRole("radiogroup", { name: "Time" });
    await user.click(within(teams).getByRole("radio", { name: "Sub-20 1" }));
    expect(status()).toHaveTextContent(`1 de ${squad.length} jogadores`);
    expect(rowOf(loanedOut)).toBeInTheDocument();

    await user.click(within(teams).getByRole("radio", { name: /^Todos/ }));
    const verdicts = screen.getByRole("radiogroup", { name: "Veredito" });
    const first = within(verdicts).getAllByRole("radio")[1];
    const [, label, n] = /^(.+) (\d+)$/.exec(first.getAttribute("aria-label")!)!;
    await user.click(first);
    expect(status()).toHaveTextContent(`${n} de ${squad.length} jogadores`);
    for (const chip of table().querySelectorAll('[data-slot="verdict"]')) expect(chip).toHaveTextContent(label);
  });

  it("selecting the club's own player offers Vender, which puts the sale in the cart at the market value", async () => {
    const user = userEvent.setup();
    await openSquad();
    const player = squad[0];
    await user.click(within(rowOf(player)).getByRole("checkbox"));
    const bar = screen.getByRole("toolbar", { name: "Seleção" });
    expect(within(bar).queryByRole("button", { name: /Adicionar ao carrinho/ })).not.toBeInTheDocument();
    const sell = within(bar).getByRole("button", { name: "Vender" });
    await user.click(sell);
    expect(appStore.getState().cart.items).toEqual([
      { uid: player.uid, kind: "sell", fee: player.value, wage: player.wage, name: player.name },
    ]);
    expect(appStore.getState().ui.selectedUid).toBeNull();
    expect(sell).toHaveAttribute("aria-pressed", "true");

    const sentinel = worst.find((p) => p.value === 4_294_967_295)!;
    await user.click(within(rowOf(sentinel)).getByRole("checkbox"));
    await user.click(within(bar).getByRole("button", { name: "Vender" }));
    expect(appStore.getState().cart.items[1]).toMatchObject({ uid: sentinel.uid, fee: 0, wage: 0 });

    await user.click(within(bar).getByRole("button", { name: "Vender" }));
    expect(appStore.getState().cart.items).toEqual([]);
  });

  it("a loanee is someone else's contract: selected with your own, he gets a purchase, never a sale", async () => {
    const user = userEvent.setup();
    await openSquad();
    await user.click(within(rowOf(squad[0])).getByRole("checkbox"));
    await user.click(within(rowOf(loanedIn)).getByRole("checkbox"));
    const bar = screen.getByRole("toolbar", { name: "Seleção" });
    expect(within(bar).getByRole("button", { name: "Vender (1)" })).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: "Adicionar ao carrinho (1)" })).toBeInTheDocument();
  });

  it("keeps the Sell/Keep thresholds behind Critérios, saved in the engine settings", async () => {
    const user = userEvent.setup();
    await openSquad();
    expect(screen.queryByRole("group", { name: "Critérios do Sell/Keep" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Critérios" }));
    const criteria = screen.getByRole("group", { name: "Critérios do Sell/Keep" });
    expect(criteria).toHaveTextContent("vêm do 4-3-3 desta página");
    expect(within(criteria).queryByRole("link")).not.toBeInTheDocument();
    const pool = within(criteria).getByRole("textbox", { name: /^Minutos do pool/ });
    expect(within(criteria).getByText(/Vale para todo o app/)).toBeVisible();
    await user.clear(pool);
    await user.type(pool, "0{Enter}");
    expect(pool).toHaveAttribute("aria-invalid", "true");
    expect(appStore.getState().settings.engine.poolMinutes).toBe(300);
    await user.clear(pool);
    await user.type(pool, "450{Enter}");
    expect(appStore.getState().settings.engine.poolMinutes).toBe(450);
    const young = within(criteria).getByRole("textbox", { name: /^Idade máxima de jovem/ });
    await user.clear(young);
    await user.type(young, "21{Enter}");
    expect(appStore.getState().settings.engine.sellKeep.youngAge).toBe(21);
    await user.click(within(criteria).getByRole("button", { name: "Restaurar padrões" }));
    expect(appStore.getState().settings.engine).toMatchObject({ poolMinutes: 300, sellKeep: { youngAge: 23 } });
  });

  it("Meu elenco shows the stats of the picked slot's group preset", async () => {
    const user = userEvent.setup();
    await openElenco();
    const headers = () =>
      within(table())
        .getAllByRole("columnheader")
        .map((h) => h.textContent ?? "");
    await user.click(card(/^Atacante \(ST\)/));
    expect(headers().some((h) => h.includes("npxG/90"))).toBe(true);
    expect(headers().some((h) => h.includes("Sv%"))).toBe(false);
    await user.click(card(/^Goleiro \(GK\)/));
    expect(headers().some((h) => h.includes("Sv%"))).toBe(true);
    expect(headers().some((h) => h.includes("npxG/90"))).toBe(false);
  });

  it("Escalar em MC puts the marked player in the slot and keeps the others where they are", async () => {
    const user = userEvent.setup();
    await openElenco();
    const midfield = appStore.getState().data.analysis!.lineup.slots.indexOf("M(C)");
    await user.click(within(pitch()).getAllByRole("radio", { name: /^Meio-campista \(MC\)/ })[0]);
    const reserve = mine[1];
    const bar = () => screen.queryByRole("toolbar", { name: "Seleção" });
    expect(bar()).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: `Selecionar ${reserve.name}` }));
    await user.click(screen.getByRole("checkbox", { name: `Selecionar ${mine[2].name}` }));
    const place = within(bar()!).getByRole("button", { name: "Escalar em MC" });
    expect(place).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("checkbox", { name: `Selecionar ${mine[2].name}` }));
    await user.click(within(bar()!).getByRole("button", { name: "Escalar em MC" }));

    const saved = picks()!;
    expect(saved[String(midfield)]).toBe(reserve.uid);
    expect(saved[String(strikerSlot())]).toBe(mine[0].uid);
    expect(Object.values(saved).filter((uid) => uid === mine[2].uid || uid === mine[3].uid)).toHaveLength(2);
    expect(bar()).not.toBeInTheDocument();
    await vi.waitFor(() => expect(card(/^Meio-campista \(MC\): Reserva/)).toBeInTheDocument());
  });

  it("Limpar vaga empties the slot and freezes the rest of the XI", async () => {
    const user = userEvent.setup();
    await openElenco();
    await user.click(card(/^Atacante \(ST\)/));
    await user.click(screen.getByRole("button", { name: "Limpar vaga" }));

    const saved = picks()!;
    expect(Object.keys(saved)).toHaveLength(11);
    expect(saved[String(strikerSlot())]).toBeNull();
    expect(
      Object.values(saved)
        .filter((uid) => uid !== null)
        .sort(),
    ).toEqual([mine[2].uid, mine[3].uid].sort());
    await vi.waitFor(() => expect(card(/^Atacante \(ST\): vazio/)).toBeInTheDocument());
    expect(
      within(pitch()).getAllByRole("radio", { name: /^Zagueiro \(DC\): Zagueiro (Titular|Parceiro)/ }),
    ).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Limpar vaga" })).not.toBeInTheDocument();
    expect(card(/^Atacante \(ST\)/)).toHaveFocus();
    await openSignings(user);
    expect(screen.queryByRole("radiogroup", { name: "Veredito" })).not.toBeInTheDocument();
  });

  it("moves a player between slots from the keyboard", async () => {
    Element.prototype.scrollIntoView ??= () => {};
    const user = userEvent.setup();
    await openElenco();
    await user.click(card(/^Atacante \(ST\)/));
    await user.tab();
    expect(screen.getByRole("button", { name: "Mover Atacante (ST)" })).toHaveFocus();

    await user.keyboard(" ");
    expect(await screen.findByText(`Pegou ${mine[0].name}`)).toBeInTheDocument();
    const radios = within(pitch()).getAllByRole("radio");
    expect(radios.every((r) => r.hasAttribute("data-fit"))).toBe(true);
    const good = radios.filter((r) => r.dataset.fit === "good");
    expect(good.map((r) => r.getAttribute("aria-label"))).toEqual([expect.stringMatching(/^Atacante \(ST\)/)]);
    expect(document.querySelectorAll('[data-free-spot][data-fit="good"]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-free-spot][data-fit="poor"]')).toHaveLength(11);
    await user.keyboard("{Escape}");
    expect(await screen.findByText("Cancelado")).toBeInTheDocument();
    expect(picks()).toBeUndefined();
    expect(document.querySelector("[data-fit]")).toBeNull();

    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    expect(await screen.findByText("Sobre a posição livre Atacante (ST), joga ali (nota 20)")).toBeInTheDocument();
    expect(card(/^Atacante \(ST\)/)).toBeChecked();
    await user.keyboard(" ");
    expect(await screen.findByText(`Levou ${mine[0].name} para Atacante (ST)`)).toBeInTheDocument();

    expect(card(/^Atacante \(ST\): João Henrique/).dataset.spot).toBe("1,4");
    const { shape } = appStore.getState().fit.lineups[String(MY)];
    expect(shape?.slots[strikerSlot()].ip).toMatchObject({ position: "ST", side: "R" });
    expect(Object.keys(picks()!)).toHaveLength(11);
    expect(picks()![String(strikerSlot())]).toBe(mine[0].uid);
  });

  it("a swap still works from the keyboard", async () => {
    Element.prototype.scrollIntoView ??= () => {};
    const user = userEvent.setup();
    await openElenco();
    await user.click(card(/^Atacante \(ST\)/));
    await user.tab();
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{ArrowRight}");
    expect(await screen.findByText("Sobre a vaga Ponta esquerda (AML), fora de posição (nota 1)")).toBeInTheDocument();
    await user.keyboard(" ");
    expect(await screen.findByText("Soltou em Ponta esquerda (AML)")).toBeInTheDocument();

    const { slots } = appStore.getState().data.analysis!.lineup;
    const saved = picks()!;
    expect(saved[String(strikerSlot())]).toBeNull();
    expect(saved[String(slots.indexOf("AM(L)"))]).toBe(mine[0].uid);
    await vi.waitFor(() => expect(card(/^Ponta esquerda \(AML\): João Henrique/)).toBeInTheDocument());
    expect(card(/^Atacante \(ST\): vazio/)).toBeInTheDocument();
    expect(card(/^Atacante \(ST\)/).dataset.spot).toBe("1,3");
  });

  it("puts a squad player in the chosen slot by his name's handle, from the keyboard", async () => {
    Element.prototype.scrollIntoView ??= () => {};
    const user = userEvent.setup();
    await openElenco();
    const reserve = mine[1];
    const handle = within(rowOf(reserve)).getByRole("button", { name: `Arrastar ${reserve.name} para uma vaga` });
    await user.click(handle);
    expect(appStore.getState().ui.selectedUid).toBeNull();
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    expect(await screen.findByText("Sobre a vaga Goleiro (GK), fora de posição (nota 1)")).toBeInTheDocument();
    await user.keyboard(" ");
    expect(picks()![String(appStore.getState().data.analysis!.lineup.slots.indexOf("GK"))]).toBe(reserve.uid);
    await vi.waitFor(() => expect(card(/^Goleiro \(GK\): Reserva/)).toBeInTheDocument());
  });

  it("a squad player's drag walks the slots only", async () => {
    Element.prototype.scrollIntoView ??= () => {};
    const user = userEvent.setup();
    await openElenco();
    const reserve = mine[1];
    await user.click(within(rowOf(reserve)).getByRole("button", { name: `Arrastar ${reserve.name} para uma vaga` }));
    await user.keyboard(" ");
    expect(document.querySelector("[data-free-spot][data-fit]")).toBeNull();
    const visited = new Set<string>();
    for (let step = 0; step < 12; step++) {
      await user.keyboard("{ArrowRight}");
      expect(screen.queryByText(/^Sobre a posição livre/)).not.toBeInTheDocument();
      const over = within(pitch())
        .getAllByRole("radio")
        .filter((r) => r.hasAttribute("data-over"));
      expect(over).toHaveLength(1);
      visited.add(over[0].dataset.spot!);
    }
    expect(visited.size).toBe(11);
    await user.keyboard("{Escape}");
    expect(picks()).toBeUndefined();
  });

  it("leaving the page mid-drag cancels the drag, so the next Space drops nothing", async () => {
    Element.prototype.scrollIntoView ??= () => {};
    const user = userEvent.setup();
    const { controller } = startData(fakeSource(snapshot));
    const page = renderWithData(<Elenco />, controller);
    await vi.waitFor(() => expect(within(pitch()).getAllByRole("radio")).toHaveLength(11));
    await user.click(card(/^Atacante \(ST\)/));
    await user.tab();
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    expect(await screen.findByText("Sobre a posição livre Atacante (ST), joga ali (nota 20)")).toBeInTheDocument();

    page.unmount();
    const spaceGoesThrough = fireEvent.keyDown(document.body, { code: "Space", key: " " });
    expect(appStore.getState().fit.lineups[String(MY)]).toBeUndefined();
    expect(spaceGoesThrough).toBe(true);
    expect(fireEvent.keyDown(document.body, { code: "Tab", key: "Tab" })).toBe(true);
  });

  it("a click on a card's handle chooses its slot, as a click on the card does", async () => {
    const user = userEvent.setup();
    await openElenco();
    await user.click(screen.getByRole("button", { name: "Mover Atacante (ST)" }));
    expect(card(/^Atacante \(ST\)/)).toBeChecked();
    expect(screen.getByRole("heading", { level: 2, name: "Atacante (ST)" })).toBeInTheDocument();
    expect(picks()).toBeUndefined();
  });

  it("two edits before the engine answers both stand", async () => {
    const user = userEvent.setup();
    const engine = heldEngine();
    const { controller } = startData(fakeSource(snapshot), () => engine.client);
    renderWithData(<Elenco />, controller);
    await vi.waitFor(() => expect(within(pitch()).getAllByRole("radio")).toHaveLength(11));

    engine.hold();
    await user.click(card(/^Atacante \(ST\)/));
    await user.click(screen.getByRole("button", { name: "Limpar vaga" }));
    expect(card(/^Atacante \(ST\): vazio/)).toBeInTheDocument();
    await user.click(card(/^Zagueiro \(DC\): Zagueiro Titular/));
    await user.click(screen.getByRole("button", { name: "Limpar vaga" }));

    const saved = picks()!;
    expect(saved[String(strikerSlot())]).toBeNull();
    expect(Object.values(saved).filter((uid) => uid !== null)).toEqual([mine[3].uid]);
    expect(card(/^Zagueiro \(DC\): vazio/)).toBeInTheDocument();
    engine.release();
    await vi.waitFor(() =>
      expect(appStore.getState().data.analysis!.lineup.xi.filter((i) => i !== null)).toEqual([
        snapshot.players.findIndex((p) => p.uid === mine[3].uid),
      ]),
    );
  });

  it("an edit right after a formation change waits for the new formation's XI", async () => {
    const user = userEvent.setup();
    const engine = heldEngine();
    const { controller } = startData(fakeSource(snapshot), () => engine.client);
    renderWithData(<Elenco />, controller);
    await vi.waitFor(() => expect(within(pitch()).getAllByRole("radio")).toHaveLength(11));
    Element.prototype.scrollIntoView ??= () => {};

    engine.hold();
    await user.click(screen.getByRole("button", { name: "Formação: 4-3-3" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "4-4-2" }));
    expect(within(pitch()).getAllByRole("radio", { name: /^Atacante \(ST\)/ })).toHaveLength(2);
    await user.click(card(/^Atacante \(ST\): João Henrique/));
    const clear = screen.getByRole("button", { name: "Limpar vaga" });
    expect(clear).toBeDisabled();
    await user.click(clear);
    await user.tab();
    expect(document.activeElement).toHaveAccessibleName("Mover Atacante (ST)");
    await user.keyboard(" ");
    expect(screen.queryByText(/^Pegou /)).not.toBeInTheDocument();
    expect(picks()).toEqual({});

    engine.release();
    await vi.waitFor(() => expect(appStore.getState().data.analysis!.lineup.slots).toContain("M(L)"));
    await user.click(within(pitch()).getAllByRole("radio", { name: /^Atacante \(ST\): João Henrique/ })[0]);
    expect(screen.getByRole("button", { name: "Limpar vaga" })).toBeEnabled();
  });

  it("Escalar em is closed to a player out on loan, whom the engine never places", async () => {
    const user = userEvent.setup();
    await openSquad();
    expect(within(rowOf(loanedOut)).queryByRole("button", { name: /^Arrastar / })).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: `Selecionar ${loanedOut.name}` }));
    const place = within(screen.getByRole("toolbar", { name: "Seleção" })).getByRole("button", { name: /^Escalar em/ });
    expect(place).toHaveAttribute("aria-disabled", "true");
    expect(place).toHaveAccessibleDescription("Emprestado a outro clube: não pode ser escalado.");
  });

  it("keeps the slot and the tab picked while the app is open", async () => {
    const user = userEvent.setup();
    const { controller } = startData(fakeSource(snapshot));
    const page = renderWithData(<Elenco />, controller);
    await vi.waitFor(() => expect(within(pitch()).getAllByRole("radio")).toHaveLength(11));
    await user.click(card(/^Atacante \(ST\)/));
    await openSignings(user);
    page.unmount();

    renderWithData(<Elenco />, controller);
    expect(card(/^Atacante \(ST\)/)).toBeChecked();
    expect(screen.getByRole("tab", { name: /^Contratações/ })).toHaveAttribute("aria-selected", "true");
  });

  it("an empty Contratações with nothing to undo shows no action", async () => {
    const user = userEvent.setup();
    await openElenco();
    const { fit, lineup } = appStore.getState().data.analysis!;
    const bare = fit.findIndex((rows) => rows.length === 0);
    expect(bare).toBeGreaterThanOrEqual(0);
    const name = new RegExp(`^${slotName(lineup.slots[bare]).replace(/[()]/g, "\\$&")}`);
    await user.click(within(pitch()).getAllByRole("radio", { name })[0]);
    await openSignings(user);
    expect(status()).toHaveTextContent(/^0 jogadores/);
    expect(document.querySelector('[data-slot="empty-content"]')).not.toBeInTheDocument();
  });

  it("Automático refills the XI by minutes", async () => {
    const user = userEvent.setup();
    await openElenco();
    await user.click(card(/^Atacante \(ST\)/));
    await user.click(screen.getByRole("button", { name: "Limpar vaga" }));
    await vi.waitFor(() => expect(card(/^Atacante \(ST\): vazio/)).toBeInTheDocument());

    expect(appStore.getState().fit.lineups[String(MY)].shape).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Automático" }));
    expect(picks()).toEqual({});
    expect(appStore.getState().fit.lineups[String(MY)].shape).toBeUndefined();
    await vi.waitFor(() => expect(card(/^Atacante \(ST\): João Henrique/)).toBeInTheDocument());
  });

  it("Precisa lists the weak slots and selects one on click", async () => {
    const user = userEvent.setup();
    await openElenco();
    const needs = screen.getByRole("group", { name: "Onde o time precisa" });
    expect(needs).toHaveTextContent(/^Precisa:/);
    const items = within(needs).getAllByRole("button");
    expect(items[0]).toHaveTextContent("Goleiro vazia");
    expect(card(/^Goleiro \(GK\): vazio, precisa de reforço$/)).toBeInTheDocument();
    const perf = Math.round(squadRolePerf(appStore.getState().data.analysis!.squadRoles)(0, "ip:11"));
    expect(perf).toBeLessThan(40);
    expect(items.at(-1)).toHaveTextContent(`Atacante ${perf}`);
    expect(card(/^Atacante \(ST\): João Henrique/)).toHaveAccessibleName(/, precisa de reforço$/);

    await user.click(within(needs).getByRole("button", { name: "Lateral esquerdo vazia" }));
    expect(card(/^Lateral esquerdo \(DL\)/)).toBeChecked();
    expect(screen.getByRole("heading", { level: 2, name: "Lateral esquerdo (DL)" })).toBeInTheDocument();
  });

  it("the criteria open from Critérios and save the margin, style and league", async () => {
    const user = userEvent.setup();
    await openElenco();
    await user.click(card(/^Atacante \(ST\)/));
    await openSignings(user);
    await user.click(screen.getByRole("button", { name: "Critérios" }));
    const criteria = await screen.findByRole("group", { name: "Critérios das contratações" });
    expect(criteria).toHaveTextContent("Fora do seu clube, no time principal, com 900+ min");

    const margin = within(criteria).getByLabelText("Margem de equivalência");
    margin.focus();
    await user.keyboard("{ArrowRight}");
    expect(appStore.getState().settings.engine.fit.lvl).toBe(9);

    const style = within(criteria).getByRole("textbox", { name: /^Estilo mínimo/ });
    await user.clear(style);
    await user.type(style, "50{Enter}");
    expect(appStore.getState().settings.engine.fit.styleMin).toBe(50);

    await user.click(within(criteria).getByRole("button", { name: /^Liga dos candidatos/ }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Top 5" }));
    expect(appStore.getState().settings.engine.fit.leagueFilter).toEqual({ kind: "top5" });
    await user.keyboard("{Escape}");
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: /^Critérios ?\(alterados\)$/ })).toBeInTheDocument(),
    );
  });

  it("offers no comparison in Contratações' column menu", async () => {
    const user = userEvent.setup();
    await openElenco();
    await user.click(card(/^Atacante \(ST\)/));
    await openSignings(user);
    await user.click(screen.getByRole("button", { name: "Opções da coluna Idade" }));
    expect(await screen.findByRole("menuitem", { name: /^Filtrar/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Usar na comparação" })).not.toBeInTheDocument();
  });

  it("Só subvalorizados keeps the slot's verdict and order and adds Valor justo and Razão", async () => {
    const user = userEvent.setup();
    await openElenco();
    await user.click(card(/^Atacante \(ST\)/));
    await openSignings(user);
    const { data } = appStore.getState();
    const fit = data.analysis!.fit[strikerSlot()];
    const moneyball = Uint32Array.from(
      fit.filter((_, k) => k % 3 === 0),
      (r) => data.analysis!.uids[r.index],
    );
    appStore.setState({ data: { ...data, analysis: { ...data.analysis!, moneyball } } });
    const analysis = appStore.getState().data.analysis!;
    const listed = new Set(analysis.moneyball);
    const wanted = analysis.fit[strikerSlot()].filter((r) => listed.has(analysis.uids[r.index]));
    expect(wanted.length).toBeGreaterThan(0);
    const headers = () =>
      within(table())
        .getAllByRole("columnheader")
        .map((h) => h.textContent);
    expect(headers().join("|")).not.toMatch(/Valor justo/);

    await user.click(screen.getByRole("button", { name: /Só subvalorizados \(Moneyball\)/ }));
    expect(status()).toHaveTextContent(`${wanted.length} jogadores`);
    const names = headers().join("|");
    expect(names).toMatch(/Veredito.*Valor justo.*Razão/);
    expect(names.indexOf("Valor justo")).toBeGreaterThan(names.indexOf("Dif. hab."));
    const verdictOf = (v: string) => wanted.filter((r) => r.verdict === v).length;
    expect(screen.getByRole("radio", { name: `Melhor ${verdictOf("upgrade")}` })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: `Pior ${verdictOf("downgrade")}` })).toBeInTheDocument();
  });

  it("turning Moneyball on here leaves the Scout's chip off", async () => {
    const user = userEvent.setup();
    await openElenco();
    await user.click(card(/^Atacante \(ST\)/));
    await openSignings(user);
    await user.click(screen.getByRole("button", { name: /Só subvalorizados \(Moneyball\)/ }));
    expect(appStore.getState().ui).toMatchObject({ signingsMoneyball: true, moneyball: false });
  });

  it("says so when no candidate is undervalued, and offers to show them all", async () => {
    const user = userEvent.setup();
    await openElenco();
    await user.click(card(/^Goleiro \(GK\)/));
    await openSignings(user);
    appStore.getState().setSigningsMoneyball(true);
    expect(await screen.findByText("Nenhum candidato desta vaga está entre os subvalorizados.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mostrar todos os candidatos" }));
    expect(appStore.getState().ui.signingsMoneyball).toBe(false);
  });

  it("buys a selected candidate from the selection's bar, without opening his panel", async () => {
    const user = userEvent.setup();
    await openElenco();
    await user.click(card(/^Atacante \(ST\)/));
    await openSignings(user);
    const analysis = appStore.getState().data.analysis!;
    const best = snapshot.players[analysis.fit[strikerSlot()][0].index];
    const table = screen.getByRole("table", { name: "Jogadores" });
    expect(within(table).queryByRole("button", { name: /^Carrinho / })).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: `Selecionar ${best.name}` }));
    await user.click(
      within(screen.getByRole("toolbar", { name: "Seleção" })).getByRole("button", { name: "Adicionar ao carrinho" }),
    );
    expect(appStore.getState().cart.items).toEqual([
      { uid: best.uid, kind: "buy", fee: best.value, wage: best.wage, name: best.name },
    ]);
    expect(appStore.getState().ui.selectedUid).toBeNull();
  });

  it("paints the slot's numbers with the quality tiers, like every score in the app", async () => {
    const user = userEvent.setup();
    await openElenco();
    await user.click(card(/^Atacante \(ST\)/));
    await openSignings(user);
    const table = screen.getByRole("table", { name: "Jogadores" });
    const row = [...table.querySelectorAll<HTMLElement>("tbody tr[data-player]")].find((r) =>
      world.slice(0, 40).some((p) => String(p.uid) === r.dataset.player),
    )!;
    expect(row.querySelector('[data-column-id="fitPerf"]')).toBeNull();
    for (const id of ["perf", "fitDiff", "fitStyle", "fitAbility", "fitAbilityDiff"]) {
      const chip = row.querySelector(`[data-column-id="${id}"] [data-slot="stat-cell"]`);
      expect(chip, id).not.toBeNull();
      expect(chip, id).toHaveAttribute("data-tier");
    }
  });
});
