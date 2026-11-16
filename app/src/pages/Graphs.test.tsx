import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { REFMIN } from "@/engine/percentiles";
import { snapshotOf } from "@/engine/testing/records";
import { formatCount } from "@/lib/format";
import { TIER_NAME, TIERS } from "@/lib/quality";
import { renderWithData, resetApp, startData } from "@/shell/testing";
import { appStore } from "@/store/index";
import { fakeSource } from "@/store/testing";
import { demoPlayer, demoPlayers, worstCasePlayers } from "@/table/fixtures";
import { Graphs } from "./Graphs";
import { labeledPoints } from "./graphs/lib/labels";
import { pointLevels } from "./graphs/lib/levels";
import { DEFAULT_AXES, pointSet } from "./graphs/lib/scatter";

const benched = demoPlayer(90, { name: "Reserva de Poucos Minutos", minutes: 200 });
const players = [...demoPlayers(40), benched, ...worstCasePlayers()];
const snapshot = snapshotOf(players);

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

async function openGraphs() {
  const data = startData(fakeSource(snapshot));
  renderWithData(<Graphs />, data.controller);
  await vi.waitFor(() => expect(appStore.getState().data.analysis).not.toBeNull());
  return data;
}

function expectedPoints() {
  const { analysis, visible: masks } = appStore.getState().data;
  const visible = masks.scout;
  const { x, y } = DEFAULT_AXES.ALL;
  return pointSet(players.length, { visible, pool: analysis!.pool }, analysis!.cols[x], analysis!.cols[y]).rows.length;
}

const status = () => within(screen.getByRole("region", { name: "Gráfico de dispersão" })).getByRole("status");
const labeledRows = () =>
  within(screen.getByRole("table", { name: "Pontos rotulados" }))
    .getAllByRole("row")
    .slice(1);

describe("Graphs", () => {
  afterEach(resetApp);

  it("plots the Scout's filtered rows that have both axes and the pool's minutes", async () => {
    await openGraphs();
    expect(screen.queryByRole("group", { name: "Comparando com" })).toBeNull();
    const all = expectedPoints();
    expect(all).toBeGreaterThan(10);
    const { analysis } = appStore.getState().data;
    const at = players.indexOf(benched);
    const { x, y } = DEFAULT_AXES.ALL;
    expect([analysis!.cols[x][at], analysis!.cols[y][at]].every(Number.isFinite)).toBe(true);
    expect(analysis!.pool[at]).toBe(0);
    expect(within(screen.getByRole("table", { name: "Pontos rotulados" })).queryByText(benched.name!)).toBeNull();
    expect(status()).toHaveTextContent(new RegExp(`^${formatCount(all)} jogadores com 300\\+ min no gráfico`));
    expect(labeledRows()).toHaveLength(10);

    act(() => appStore.getState().setFilter("scout", { col: "age", kind: "range", max: 24 }));
    await vi.waitFor(() => expect(appStore.getState().data.visible.scout).not.toBeNull());
    const young = expectedPoints();
    expect(young).toBeLessThan(all);
    await vi.waitFor(() =>
      expect(status()).toHaveTextContent(new RegExp(`^${formatCount(young)} jogadores com 300\\+ min no gráfico`)),
    );
    for (const row of labeledRows()) {
      const uid = Number(row.dataset.player);
      expect(players.find((p) => p.uid === uid)!.age).toBeLessThanOrEqual(24);
    }
  });

  it("opens the panel from the labeled list with Enter", async () => {
    await openGraphs();
    const row = labeledRows()[0];
    row.focus();
    fireEvent.keyDown(row, { key: "Enter" });
    expect(appStore.getState().ui.selectedUid).toBe(Number(row.dataset.player));
  });

  it("swaps the axes and keeps the pair for the position", async () => {
    await openGraphs();
    await userEvent.click(screen.getByRole("button", { name: "Trocar eixos" }));
    expect(appStore.getState().ui.graphs.axes.ALL).toEqual({ x: DEFAULT_AXES.ALL.y, y: DEFAULT_AXES.ALL.x });
    expect(screen.getByRole("button", { name: /^Eixo X: npG\/90/ })).toBeInTheDocument();
  });

  it("opens on the axes of the Pos filter's position, and keeps a pair for each", async () => {
    await openGraphs();
    act(() => appStore.getState().setFilter("scout", { col: "naturalPositions", kind: "set", values: ["DC"] }));
    expect(await screen.findByRole("button", { name: /^Eixo X: Hdr%/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Trocar eixos" }));
    expect(appStore.getState().ui.graphs.axes).toEqual({ ZAG: { x: DEFAULT_AXES.ZAG.y, y: DEFAULT_AXES.ZAG.x } });
    act(() => appStore.getState().clearFilters("scout"));
    expect(await screen.findByRole("button", { name: /^Eixo X: npxG\/90/ })).toBeInTheDocument();
  });

  it("plots Performance against a stat, which the axes offer like any score", async () => {
    await openGraphs();
    act(() => appStore.getState().setGraphAxes("ALL", { x: "perf", y: "G/90" }));
    expect(await screen.findByRole("button", { name: /^Eixo X: Perf\./ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Eixo Y: G\/90/ })).toBeInTheDocument();
  });

  it("says why nothing is plotted and offers the way out", async () => {
    await openGraphs();
    act(() => appStore.getState().setFilter("scout", { col: "age", kind: "range", max: 1 }));
    expect(await screen.findByRole("heading", { name: "Nenhum jogador no gráfico" })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Limpar filtros" }).at(-1)!);
    expect(appStore.getState().filters.scout).toEqual([]);
  });

  it("legends the five levels of the points with how many each holds, all of them counted once", async () => {
    await openGraphs();
    const { analysis, visible: masks } = appStore.getState().data;
    const visible = masks.scout;
    const { x, y } = DEFAULT_AXES.ALL;
    const points = pointSet(players.length, { visible, pool: analysis!.pool }, analysis!.cols[x], analysis!.cols[y]);
    const levels = pointLevels(points, true, true)!;
    const legend = screen.getByRole("list", { name: "Níveis no gráfico" });
    const items = within(legend).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(
      TIERS.map(
        (t) => `${TIER_NAME[t]}${formatCount(levels.counts[t])} ${levels.counts[t] === 1 ? "jogador" : "jogadores"}`,
      ),
    );
    expect(TIERS.reduce((sum, t) => sum + levels.counts[t], 0)).toBe(points.rows.length);
  });

  it("gives each labeled row its level as a tier chip, the keyboard's way to the colours", async () => {
    await openGraphs();
    for (const row of labeledRows()) {
      const chip = row.querySelector('[data-slot="stat-cell"]');
      expect(chip).not.toBeNull();
      expect(chip).toHaveAttribute("data-tier");
    }
  });

  it("explains how to read the chart on demand, in a few plain lines about its own axes", async () => {
    await openGraphs();
    const toggle = screen.getByRole("button", { name: "Como ler este gráfico" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const help = screen.getByRole("region", { name: "Como ler este gráfico" });
    const { x, y } = DEFAULT_AXES.ALL;
    expect(help).toHaveTextContent(`Mais à direita, mais ${x}`);
    expect(help).toHaveTextContent(`Mais acima, mais ${y}`);
    expect(help).toHaveTextContent(/canto de cima à direita/i);
    expect(help).toHaveTextContent(/cor/i);
    expect(within(help).getAllByRole("listitem").length).toBeLessThanOrEqual(4);

    act(() => appStore.getState().setGraphAxes("ALL", { x: "PossLost/90", y: "Ast/90" }));
    expect(await screen.findByText(/Mais à direita, menos PossLost\/90/)).toBeInTheDocument();
  });

  it("names no level when too few points are plotted for a percentile", async () => {
    await openGraphs();
    const { analysis, visible: masks } = appStore.getState().data;
    const visible = masks.scout;
    const { x, y } = DEFAULT_AXES.ALL;
    const plotted = pointSet(players.length, { visible, pool: analysis!.pool }, analysis!.cols[x], analysis!.cols[y]);
    const ages = Array.from(plotted.rows, (i) => players[i].age!).sort((a, b) => a - b);
    const maxAge = ages.filter((age) => ages.filter((a) => a <= age).length < REFMIN).at(-1)!;
    act(() => appStore.getState().setFilter("scout", { col: "age", kind: "range", max: maxAge }));
    await vi.waitFor(() => expect(screen.queryByRole("list", { name: "Níveis no gráfico" })).not.toBeInTheDocument());
    expect(screen.getByText(/Menos de 20 jogadores no gráfico/)).toBeInTheDocument();
    const chips = labeledRows().map((row) => row.querySelector<HTMLElement>('[data-slot="stat-cell"]')!);
    for (const chip of chips) {
      expect(chip).not.toHaveAttribute("data-tier");
      expect(chip.querySelector(".sr-only")).toHaveTextContent(
        "Nível nos dois eixos: menos de 20 jogadores no gráfico",
      );
    }
    await userEvent.hover(chips[0]);
    const tip = await screen.findByText("menos de 20 jogadores no gráfico", {}, { timeout: 2000 });
    expect(tip.closest("[data-slot=tooltip-content]")).not.toBeNull();
  });

  it("names no level when every plotted player sits on the same spot, and says so", async () => {
    const twins = Array.from({ length: REFMIN + 5 }, () => demoPlayer(1));
    renderWithData(<Graphs />, startData(fakeSource(snapshotOf(twins))).controller);
    expect(
      await screen.findByText("Todos os jogadores no mesmo ponto: nada para separar em níveis."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Níveis no gráfico" })).not.toBeInTheDocument();
    for (const row of labeledRows()) {
      expect(row.querySelector(".sr-only")).toHaveTextContent(
        "Nível nos dois eixos: todos os jogadores no mesmo ponto",
      );
    }
  });

  it("labels the best by z with fewer-is-better stats inverted", async () => {
    await openGraphs();
    act(() => appStore.getState().setGraphAxes("ALL", { x: "PossLost/90", y: "Ast/90" }));
    const { analysis, visible: masks } = appStore.getState().data;
    const visible = masks.scout;
    const points = pointSet(
      players.length,
      { visible, pool: analysis!.pool },
      analysis!.cols["PossLost/90"],
      analysis!.cols["Ast/90"],
    );
    const best = labeledPoints(points, 10, false, true).map((k) => String(analysis!.uids[points.rows[k]]));
    expect(labeledRows().map((row) => row.dataset.player)).toEqual(best);
    expect(best).not.toEqual(labeledPoints(points, 10, true, true).map((k) => String(analysis!.uids[points.rows[k]])));
  });
});
