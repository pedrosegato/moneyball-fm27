import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { minutesOf } from "@/engine/club";
import { groupsOf } from "@/engine/positions";
import { averageRating } from "@/engine/rank";
import { snapshotOf } from "@/engine/testing/records";
import { renderWithData, resetApp, startData } from "@/shell/testing";
import { appStore } from "@/store/index";
import { fakeSource } from "@/store/testing";
import { demoPlayer, demoPlayers, ratings, worstCasePlayers } from "@/table/fixtures";
import { Rank } from "../Rank";

const players = [
  ...demoPlayers(24).map((p, k) => ({
    ...p,
    pos: ratings("ST"),
    division: k % 2 ? "Premier League" : "Liga Inventada",
  })),
  demoPlayer(60, { name: "Zagueiro Só", pos: ratings("DC"), division: "Eredivisie" }),
  ...worstCasePlayers(),
];
const snapshot = snapshotOf(players, { my_clubs: [{ name: "MFC", uid: 301344 }] });

const table = () => screen.getByRole("table", { name: "Jogadores" });
const header = (id: string) => table().querySelector(`thead [data-column-id="${id}"]`);
const shown = () =>
  [...table().querySelectorAll<HTMLElement>("tbody tr[data-position]")]
    .sort((a, b) => Number(a.dataset.position) - Number(b.dataset.position))
    .map((r) => Number(r.dataset.player));

async function openRank() {
  const { controller } = startData(fakeSource(snapshot));
  renderWithData(<Rank />, controller);
  await vi.waitFor(() => expect(table().querySelectorAll("tbody tr[data-player]").length).toBeGreaterThan(5));
}

describe("Rank", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(2000);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1400);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    resetApp();
  });

  it("ranks the pool plainly first, then weighted, showing the weight and the move only when it counts", async () => {
    const user = userEvent.setup();
    await openRank();
    expect(screen.queryByRole("group", { name: "Comparando com" })).toBeNull();
    expect(header("rankPos")).toBeInTheDocument();
    expect(header("rankBase")).toHaveTextContent("Av Rat");
    expect(header("rankWeighted")).toBeNull();
    const plain = shown();
    const unplayed = players.find((p) => p.name === "Tifany Hoyos")!;
    expect(plain).not.toContain(unplayed.uid);

    await user.click(screen.getByRole("radio", { name: "Com peso da liga" }));
    expect(header("rankWeighted")).toBeInTheDocument();
    expect(header("rankMove")).toBeInTheDocument();
    expect(shown()).not.toEqual(plain);
    expect(screen.getByRole("main").textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("narrows to one position group of its own, leaving the table filters the other pages share alone", async () => {
    const user = userEvent.setup();
    await openRank();
    const filtersBefore = appStore.getState().filters;
    await user.click(screen.getByRole("button", { name: /^Posição do Rank/ }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Zagueiro" }));
    const zag = players
      .filter((p) => groupsOf(p.pos).includes("ZAG") && minutesOf(p) >= 300 && !Number.isNaN(averageRating(p)))
      .map((p) => p.uid);
    expect(zag.length).toBeGreaterThan(2);
    await vi.waitFor(() => expect(shown().sort()).toEqual(zag.sort()));
    expect(screen.getByRole("button", { name: "Posição do Rank: Zagueiro" })).toBeInTheDocument();
    expect(appStore.getState().filters).toBe(filtersBefore);
    expect(screen.queryByRole("group", { name: "Filtros ativos" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Posição do Rank/ }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Todas as posições" }));
    await vi.waitFor(() => expect(shown().length).toBeGreaterThan(zag.length));
    expect(appStore.getState().filters).toBe(filtersBefore);
  });

  it("keeps the average rating a plain number and paints a percentile score with the quality tiers", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    Element.prototype.scrollIntoView ??= () => {};
    const user = userEvent.setup();
    await openRank();
    const firstRow = () => table().querySelector<HTMLElement>("tbody tr[data-position='0']")!;
    expect(firstRow().querySelector('[data-column-id="rankBase"] [data-slot="stat-cell"]')).toBeNull();

    await user.click(screen.getByRole("button", { name: /^Ordenar por/ }));
    await user.click(await screen.findByRole("option", { name: /^G\/90Gols por 90/ }));
    await vi.waitFor(() => expect(header("rankBase")).toHaveTextContent("G/90 pct"));
    expect(firstRow().querySelector('[data-column-id="rankBase"] [data-slot="stat-cell"]')).toHaveAttribute(
      "data-tier",
    );
    expect(screen.getByText("Quem tem 300+ min; percentis na posição dele")).toBeInTheDocument();
    expect(screen.queryByText(/Comparando com/)).toBeNull();
  });
});
