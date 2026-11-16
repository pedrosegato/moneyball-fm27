import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFAULT_ENGINE_SETTINGS } from "@/engine/analysis/input";
import { ATTRIBUTE_NAMES } from "@/engine/data/attributes";
import { runAnalysis } from "@/engine/index";
import type { PosGroup } from "@/engine/positions";
import { snapshotOf } from "@/engine/testing/records";
import type { ColumnFiltering } from "@/filters/lib/headerMenu";
import { formatStat } from "@/lib/format";
import { resetApp } from "@/shell/testing";
import type { ColumnsState } from "@/store/columns";
import { defaultComposites, engineComposites } from "@/store/composites";
import { appStore } from "@/store/index";
import type { SearchKey, ValueMode } from "@/store/ui";
import { buildColumns } from "./columns/build";
import type { TableSource } from "./columns/types";
import type { EmptyAction } from "./components/TableEmpty";
import { allRows, analyzeFixture, demoPlayer, demoPlayers, ratings, worstCasePlayers } from "./fixtures";
import type { SelectionAction } from "./lib/selectionActions";
import { PlayerTable } from "./PlayerTable";
import { defaultColumnsFor, IDENTITY_DEFAULTS } from "./presets";

interface HarnessProps {
  source: TableSource;
  group?: PosGroup | null;
  rows?: Uint32Array;
  total?: number;
  filtering?: ColumnFiltering;
  emptyActions?: readonly EmptyAction[];
  mode?: ValueMode;
  columns?: ColumnsState;
  onOpenPlayer?: (uid: number) => void;
  onColumnsChange?: (columns: ColumnsState) => void;
  fixed?: readonly string[];
  defaultSort?: { id: string; desc: boolean };
  emptyDescription?: string;
  selectionActions?: readonly SelectionAction[];
  searchKey?: SearchKey;
  position?: ReactNode;
  chips?: ReactNode;
  filterBar?: ReactNode;
  filtersPanel?: ReactNode;
  criteria?: ReactNode;
}

function Harness({
  source,
  group = null,
  rows,
  total,
  filtering,
  emptyActions,
  mode: initialMode = "value",
  columns: initialColumns,
  onOpenPlayer,
  onColumnsChange,
  fixed,
  defaultSort,
  emptyDescription,
  selectionActions,
  searchKey = "scout",
  ...head
}: HarnessProps) {
  const [mode, setMode] = useState<ValueMode>(initialMode);
  const [columns, setColumns] = useState<ColumnsState>(initialColumns ?? { presets: {}, groups: [] });
  const latest = useRef(columns);
  const everyRow = useMemo(() => allRows(source.players.length), [source]);
  const update = (change: (current: ColumnsState) => ColumnsState) => {
    latest.current = change(latest.current);
    setColumns(latest.current);
    onColumnsChange?.(latest.current);
  };
  return (
    <TooltipProvider>
      <PlayerTable
        rows={rows ?? everyRow}
        players={source.players}
        analysis={source.analysis}
        composites={source.composites}
        mode={mode}
        onModeChange={setMode}
        columnState={{ group, ...columns, fixed }}
        columnActions={{
          setColumnPreset: (key, list) => update((c) => ({ ...c, presets: { ...c.presets, [key]: list } })),
          resetColumnPreset: (key) =>
            update((c) => {
              const { [key]: _gone, ...presets } = c.presets;
              return { ...c, presets };
            }),
          setColumnGroups: (groups) => update((c) => ({ ...c, groups })),
        }}
        onOpenPlayer={onOpenPlayer ?? (() => {})}
        total={total}
        filtering={filtering}
        emptyActions={emptyActions}
        emptyDescription={emptyDescription}
        defaultSort={defaultSort}
        selectionActions={selectionActions}
        searchKey={searchKey}
        {...head}
      />
    </TooltipProvider>
  );
}

const headerIds = () => screen.getAllByRole("columnheader").map((th) => th.dataset.columnId);
const bodyRows = () =>
  within(screen.getByTestId("player-rows"))
    .getAllByRole("row")
    .filter((r) => r.dataset.player);
const rowOf = (name: string) => bodyRows().find((r) => within(r).queryByText(name))!;
const shownIn = (row: HTMLElement, columnId: string) => {
  const cell = row.querySelector<HTMLElement>(`[data-column-id="${CSS.escape(columnId)}"]`)!;
  return (cell.querySelector("[aria-hidden]") ?? cell).textContent;
};

const visibleText = (cell: HTMLElement) => {
  const shown = cell.cloneNode(true) as HTMLElement;
  for (const hidden of shown.querySelectorAll(".sr-only")) hidden.remove();
  return shown.textContent;
};

const EVERY_COLUMN: ColumnsState = {
  presets: { ATA: buildColumns(analyzeFixture(demoPlayers(3))).map((c) => c.id) },
  groups: [],
};

const fitEveryColumn = () => vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(20_000);

const inReadingOrder = (...nodes: HTMLElement[]) =>
  nodes.every(
    (node, k) => k === 0 || !!(nodes[k - 1].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING),
  );

const headerControls = () =>
  screen.getAllByRole("columnheader").flatMap((th) => [...th.querySelectorAll<HTMLElement>("[data-header-slot]")]);

describe("PlayerTable", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(2000);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1200);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetApp();
  });

  const source = analyzeFixture(demoPlayers(30));

  it("selecting ATA switches visible columns to the ATA preset", () => {
    const { rerender } = render(<Harness source={source} group={null} />);
    expect(headerIds()).toEqual(["name", ...defaultColumnsFor(null)]);
    rerender(<Harness source={source} group="ATA" />);
    expect(headerIds()).toEqual(["name", ...defaultColumnsFor("ATA")]);
  });

  it("shows the user's own preset for a group once it was edited", () => {
    render(
      <Harness source={source} group="ATA" columns={{ presets: { ATA: ["age", "xA/90", "G/90"] }, groups: [] }} />,
    );
    expect(headerIds()).toEqual(["name", "age", "xA/90", "G/90"]);
  });

  it("labels each run of same-group stat columns once, and the player's own facts not at all", () => {
    render(<Harness source={source} group="ATA" />);
    const captions = [...document.querySelectorAll("[data-group-caption]")].map((c) => c.textContent);
    expect(captions).toEqual(["Gols", "Finalização", "Gols", "Criação", "Compostas"]);
  });

  it("counts the rows in the toolbar, singular for one", () => {
    const one = analyzeFixture(demoPlayers(1));
    const { rerender } = render(<Harness source={source} />);
    expect(screen.getByRole("status")).toHaveTextContent(/^30 jogadores$/);
    rerender(<Harness source={one} />);
    expect(screen.getByRole("status")).toHaveTextContent(/^1 jogador$/);
  });

  it("the head shows who is listed on top and how on the second row", () => {
    render(
      <Harness
        source={source}
        position={<button type="button">Posição: Todas</button>}
        filtersPanel={<button type="button">Filtros</button>}
        chips={<button type="button">Só subvalorizados (Moneyball)</button>}
        filterBar={<fieldset aria-label="Filtros ativos" />}
        criteria={<button type="button">Critérios</button>}
      />,
    );
    const who = screen.getByRole("group", { name: "Quem aparece" });
    const how = screen.getByRole("group", { name: "Como aparece" });
    expect(inReadingOrder(who, how)).toBe(true);
    const count = within(who).getByRole("status");
    expect(count).toHaveTextContent(/^30 jogadores$/);
    expect(
      inReadingOrder(
        within(who).getByRole("searchbox", { name: "Buscar nesta lista" }),
        within(who).getByRole("button", { name: "Posição: Todas" }),
        within(who).getByRole("button", { name: "Filtros" }),
        within(who).getByRole("button", { name: "Só subvalorizados (Moneyball)" }),
        within(who).getByRole("group", { name: "Filtros ativos" }),
        count,
      ),
    ).toBe(true);
    expect(
      inReadingOrder(
        within(how).getByRole("group", { name: "Grupos de colunas" }),
        within(how).getByRole("radiogroup", { name: "Exibição" }),
        within(how).getByRole("button", { name: "Colunas" }),
        within(how).getByRole("button", { name: "Critérios" }),
        within(how).getByRole("button", { name: "CSV" }),
      ),
    ).toBe(true);
  });

  it("a search narrows only its own table, by name or club, without case or accents", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Harness source={source} searchKey="scout" />
        <Harness source={source} searchKey="elenco" />
      </>,
    );
    const [scout, elenco] = screen.getAllByRole("region", { name: "Tabela de jogadores" });
    const { name } = source.players[3];
    const matches = source.players.filter((p) => p.name === name).length;
    await user.type(within(scout).getByRole("searchbox", { name: "Buscar nesta lista" }), name.toUpperCase());
    await vi.waitFor(() => expect(within(scout).getByRole("status")).toHaveTextContent(`${matches} de 30 jogadores`));
    expect(appStore.getState().ui.searches).toEqual({ scout: name.toUpperCase() });
    expect(within(elenco).getByRole("status")).toHaveTextContent(/^30 jogadores$/);
    expect(within(elenco).getByRole("searchbox", { name: "Buscar nesta lista" })).toHaveValue("");
  });

  it("an empty search says so and offers Limpar busca first, then the page's ways out", async () => {
    const clearFilters = vi.fn();
    act(() => appStore.getState().setSearch("scout", "Ninguém Assim"));
    render(<Harness source={source} emptyActions={[{ label: "Limpar filtros", onClick: clearFilters }]} />);
    expect(await screen.findByRole("heading", { name: "Nenhum jogador" })).toBeInTheDocument();
    expect(screen.getByText("Ninguém com “Ninguém Assim” no nome ou no clube nesta lista.")).toBeInTheDocument();
    const empty = screen.getByRole("heading", { name: "Nenhum jogador" }).closest<HTMLElement>('[data-slot="empty"]')!;
    const ways = within(empty).getAllByRole("button");
    expect(ways.map((b) => b.textContent)).toEqual(["Limpar busca", "Limpar filtros"]);
    expect(ways[0]).toHaveClass("bg-primary");
    expect(ways[1]).not.toHaveClass("bg-primary");
    await userEvent.click(ways[0]);
    expect(appStore.getState().ui.searches.scout).toBe("");
    await vi.waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/^30 jogadores$/));
  });

  it("leaves the search out of an empty state the filters made, with the page's way out leading", () => {
    const clearFilters = vi.fn();
    act(() => appStore.getState().setSearch("scout", "Ninguém Assim"));
    const ways = [{ label: "Limpar filtros", onClick: clearFilters }];
    render(<Harness source={source} rows={new Uint32Array()} total={30} emptyActions={ways} />);
    expect(screen.getByText("Nenhum jogador passa pelos filtros. Afrouxe ou limpe algum.")).toBeInTheDocument();
    expect(screen.queryByText(/Ninguém com/)).toBeNull();
    const empty = screen.getByRole("heading", { name: "Nenhum jogador" }).closest<HTMLElement>('[data-slot="empty"]')!;
    const buttons = within(empty).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Limpar filtros"]);
    expect(buttons[0]).toHaveClass("bg-primary");
  });

  it("Ctrl K focuses the search of the table on the page", () => {
    render(<Harness source={source} />);
    fireEvent.keyDown(document.body, { key: "k", code: "KeyK", ctrlKey: true });
    expect(screen.getByRole("searchbox", { name: "Buscar nesta lista" })).toHaveFocus();
  });

  it("value/percentile toggle changes cell content", async () => {
    const strikers = analyzeFixture(demoPlayers(30).map((p) => ({ ...p, pos: ratings("ST") })));
    render(<Harness source={strikers} group="ATA" />);
    const k = 3;
    const name = strikers.players[k].name;
    const value = strikers.analysis.cols["G/90"][k];
    const pct = strikers.analysis.pct["G/90"][k];
    expect(Number.isNaN(pct)).toBe(false);

    expect(shownIn(rowOf(name), "G/90")).toBe(formatStat(value, "per90"));
    await userEvent.click(screen.getByRole("radio", { name: "Percentil" }));
    expect(shownIn(rowOf(name), "G/90")).toBe(String(Math.round(pct)));
  });

  it("sorts on a header click with missing values last, either way", async () => {
    const withUnplayed = analyzeFixture([...demoPlayers(25), demoPlayer(40, { name: "Sem Minutos", minutes: 0 })]);
    render(<Harness source={withUnplayed} group="ATA" />);
    const g90 = withUnplayed.analysis.cols["G/90"];
    const names = () => bodyRows().map((r) => r.dataset.player);
    const best = Array.from(g90.keys())
      .filter((i) => !Number.isNaN(g90[i]))
      .sort((a, b) => g90[b] - g90[a] || a - b)[0];

    await userEvent.click(screen.getByRole("button", { name: "G/90" }));
    expect(screen.getByRole("columnheader", { name: "G/90" })).toHaveAttribute("aria-sort", "descending");
    expect(names()[0]).toBe(String(withUnplayed.players[best].uid));
    expect(names().at(-1)).toBe(String(withUnplayed.players[25].uid));

    await userEvent.click(screen.getByRole("button", { name: "G/90" }));
    expect(screen.getByRole("columnheader", { name: "G/90" })).toHaveAttribute("aria-sort", "ascending");
    expect(names().at(-1)).toBe(String(withUnplayed.players[25].uid));

    await userEvent.click(screen.getByRole("button", { name: "G/90" }));
    expect(screen.getByRole("columnheader", { name: "G/90" })).not.toHaveAttribute("aria-sort");
    expect(screen.getByRole("columnheader", { name: /^Perf\./ })).toHaveAttribute("aria-sort", "descending");
  });

  it("combined column groups show the player's facts and those groups' columns in chip order, never the preset's stats", async () => {
    fitEveryColumn();
    const onColumnsChange = vi.fn();
    render(<Harness source={source} group="ATA" onColumnsChange={onColumnsChange} />);
    const chips = screen.getByRole("group", { name: "Grupos de colunas" });
    const chip = (name: string) => within(chips).getByRole("button", { name });
    expect(chip("Geral")).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(chip("Finalização"));
    await userEvent.click(chip("Gols"));
    expect(onColumnsChange).toHaveBeenLastCalledWith({ presets: {}, groups: ["gols", "finalizacao"] });
    const of = (group: string) =>
      buildColumns(source)
        .filter((c) => c.group === group)
        .map((c) => c.id);
    expect(headerIds()).toEqual(["name", ...IDENTITY_DEFAULTS, ...of("gols"), ...of("finalizacao")]);
    expect(headerIds()).not.toContain("perf");
    expect(chip("Geral")).toHaveAttribute("aria-pressed", "false");
    expect(chip("Gols")).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(chip("Gols"));
    expect(onColumnsChange).toHaveBeenLastCalledWith({ presets: {}, groups: ["finalizacao"] });
    await userEvent.click(chip("Finalização"));
    expect(onColumnsChange).toHaveBeenLastCalledWith({ presets: {}, groups: [] });
    expect(chip("Geral")).toHaveAttribute("aria-pressed", "true");
    expect(headerIds()).toEqual(["name", ...defaultColumnsFor("ATA")]);
  });

  it("Geral turns every column group off, back to the position's preset", async () => {
    const onColumnsChange = vi.fn();
    render(
      <Harness
        source={source}
        group="ATA"
        columns={{ presets: {}, groups: ["criacao", "passe", "cruzamento"] }}
        onColumnsChange={onColumnsChange}
      />,
    );
    const chips = screen.getByRole("group", { name: "Grupos de colunas" });
    await userEvent.click(within(chips).getByRole("button", { name: "Geral" }));
    expect(onColumnsChange).toHaveBeenLastCalledWith({ presets: {}, groups: [] });
    expect(within(chips).getByRole("button", { name: "Geral" })).toHaveAttribute("aria-pressed", "true");
    expect(within(chips).getByRole("button", { name: "Passe" })).toHaveAttribute("aria-pressed", "false");
    expect(headerIds()).toEqual(["name", ...defaultColumnsFor("ATA")]);
  });

  it("the Colunas menu edits the Geral preset, so a change made under column groups goes back to it", async () => {
    const onColumnsChange = vi.fn();
    render(
      <Harness
        source={source}
        group="ATA"
        columns={{ presets: {}, groups: ["gols"] }}
        onColumnsChange={onColumnsChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Colunas" }));
    await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: /^Drb\/90 / }));
    expect(onColumnsChange).toHaveBeenLastCalledWith({
      presets: { ATA: [...defaultColumnsFor("ATA"), "Drb/90"] },
      groups: [],
    });
    expect(screen.getByRole("button", { name: "Geral" })).toHaveAttribute("aria-pressed", "true");
    expect(headerIds()).toContain("Drb/90");
  });

  it("moves along the column group chips with the arrows and toggles them with Space and Enter", async () => {
    fitEveryColumn();
    const user = userEvent.setup();
    render(<Harness source={source} group="ATA" />);
    const chips = screen.getByRole("group", { name: "Grupos de colunas" });
    const chip = (name: string) => within(chips).getByRole("button", { name });
    chip("Geral").focus();
    await user.keyboard("{ArrowRight}");
    expect(chip("Gols")).toHaveFocus();
    expect(chip("Gols")).toHaveAttribute("aria-pressed", "false");
    await user.keyboard(" ");
    expect(chip("Gols")).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{ArrowRight}{Enter}");
    expect(chip("Finalização")).toHaveAttribute("aria-pressed", "true");
    expect(headerIds()).toEqual(expect.arrayContaining(["G/90", "Shots/90"]));
    await user.keyboard(" ");
    await user.keyboard("{ArrowLeft} ");
    expect(chip("Geral")).toHaveAttribute("aria-pressed", "true");
  });

  it("sorts under column groups by the first group's first column when the Performance is not shown", () => {
    render(<Harness source={source} group="ATA" columns={{ presets: {}, groups: ["gols", "passe"] }} />);
    const first = buildColumns(source).find((c) => c.group === "gols")!;
    expect(screen.getByRole("columnheader", { name: first.abbr })).toHaveAttribute("aria-sort", "descending");
  });

  it("the Colunas menu hides a column and saves it in the group's preset", async () => {
    const onColumnsChange = vi.fn();
    render(<Harness source={source} group="ATA" onColumnsChange={onColumnsChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Colunas" }));
    await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: /^xG\/Shot / }));
    const saved = defaultColumnsFor("ATA").filter((id) => id !== "xG/Shot");
    expect(onColumnsChange).toHaveBeenLastCalledWith({ presets: { ATA: saved }, groups: [] });
    expect(headerIds()).not.toContain("xG/Shot");
  });

  it("opens the player on a click and on Enter", async () => {
    const onOpenPlayer = vi.fn();
    render(<Harness source={source} onOpenPlayer={onOpenPlayer} />);
    const row = bodyRows()[1];
    await userEvent.click(row);
    expect(onOpenPlayer).toHaveBeenLastCalledWith(Number(row.dataset.player));

    fireEvent.keyDown(row, { key: "ArrowDown" });
    expect(bodyRows()[2]).toHaveFocus();
    fireEvent.keyDown(bodyRows()[2], { key: "Enter" });
    expect(onOpenPlayer).toHaveBeenLastCalledWith(Number(bodyRows()[2].dataset.player));
  });

  it("first sorts a lower-is-better stat best first in either mode", async () => {
    render(<Harness source={source} group="ZAG" />);
    const fouls = source.analysis.cols["Fouls/90"];
    const fewest = Array.from(fouls.keys()).sort((a, b) => fouls[a] - fouls[b] || a - b)[0];
    await userEvent.click(screen.getByRole("button", { name: "Fouls/90" }));
    expect(screen.getByRole("columnheader", { name: "Fouls/90" })).toHaveAttribute("aria-sort", "ascending");
    expect(bodyRows()[0].dataset.player).toBe(String(source.players[fewest].uid));

    await userEvent.click(screen.getByRole("radio", { name: "Percentil" }));
    await userEvent.click(screen.getByRole("button", { name: "Tck%" }));
    await userEvent.click(screen.getByRole("button", { name: "Fouls/90" }));
    expect(screen.getByRole("columnheader", { name: "Fouls/90" })).toHaveAttribute("aria-sort", "descending");
  });

  it("keeps a tab stop in the body after the active row scrolled out of the window", () => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(320);
    const many = analyzeFixture(demoPlayers(200));
    render(<Harness source={many} />);
    const scroller = screen.getByRole("table").parentElement!;
    Object.defineProperty(scroller, "scrollTop", { configurable: true, writable: true, value: 4000 });
    fireEvent.scroll(scroller);

    expect(bodyRows().some((r) => Number(r.dataset.position) > 100)).toBe(true);
    const stops = bodyRows().filter((r) => r.tabIndex === 0);
    expect(stops.map((r) => r.dataset.position)).toEqual(["0"]);
  });

  it("swapping value and percentile keeps the scroll position and the active row", async () => {
    render(<Harness source={source} group="ATA" />);
    await userEvent.click(screen.getByRole("button", { name: "G/90" }));
    await userEvent.click(bodyRows()[3]);
    const scroller = screen.getByRole("table").parentElement!;
    Object.defineProperty(scroller, "scrollTop", { configurable: true, writable: true, value: 96 });

    await userEvent.click(screen.getByRole("radio", { name: "Percentil" }));
    expect(scroller.scrollTop).toBe(96);
    expect(
      bodyRows()
        .filter((r) => r.tabIndex === 0)
        .map((r) => r.dataset.position),
    ).toEqual(["3"]);
  });

  it("draws Habilidade and Stats vs ability as tier chips, the number on show and the colour from the model", () => {
    fitEveryColumn();
    const attrs = (k: number) => Array.from({ length: ATTRIBUTE_NAMES.length }, (_, a) => 5 * (6 + ((k * 7 + a) % 14)));
    const rated = analyzeFixture(demoPlayers(30).map((p, k) => ({ ...p, pos: ratings("ST"), attrs: attrs(k) })));
    render(
      <Harness source={rated} group="ATA" columns={{ presets: { ATA: ["ability", "statsVsAbility"] }, groups: [] }} />,
    );
    const k = Array.from(rated.analysis.abilityPct.keys()).find((i) => !Number.isNaN(rated.analysis.abilityPct[i]))!;
    const row = rowOf(rated.players[k].name);
    const ability = row.querySelector('[data-column-id="ability"] [data-slot="stat-cell"]')!;
    expect(ability).toHaveAttribute("data-tier");
    expect(ability.querySelector("[aria-hidden]")!.textContent).toBe(
      rated.analysis.ability[k].toFixed(1).replace(".", ","),
    );
    const delta = row.querySelector('[data-column-id="statsVsAbility"] [data-slot="stat-cell"]')!;
    expect(delta).toHaveAttribute("data-tier");
  });

  it("explains a header in plain words in its tooltip: the full name, what it measures, the unit", async () => {
    const user = userEvent.setup();
    render(<Harness source={source} group="ATA" />);
    await user.hover(screen.getByRole("button", { name: "npxG/90" }));
    const tip = await screen.findByText(/gols esperados sem pênaltis a cada 90 minutos/, {}, { timeout: 2000 });
    expect(tip.closest("[data-slot=tooltip-content]")).toHaveTextContent(
      /^Gols esperados sem pênalti \(npxG\) por 90 — gols esperados sem pênaltis a cada 90 minutos.*Unidade: a cada 90 minutos em campo$/,
    );
  });

  it("says why a stat has no percentile: its own sample or a small position group", async () => {
    const label = (row: HTMLElement, id: string) =>
      row.querySelector(`[data-column-id="${CSS.escape(id)}"] .sr-only`)!.textContent;
    const noShots = demoPlayer(60, { name: "Sem Chutes" });
    noShots.record = { ...noShots.record, shots: 0, sot: 0 };
    const unplayed = demoPlayer(61, { name: "Sem Jogos", minutes: 0 });
    const { unmount } = render(
      <Harness source={analyzeFixture([...demoPlayers(25), noShots, unplayed])} group="ATA" />,
    );
    expect(label(rowOf("Sem Chutes"), "SoT%")).toBe("Chutes no alvo (%): amostra pequena");
    expect(label(rowOf("Sem Jogos"), "SoT%")).toBe("Chutes no alvo (%): sem dados");
    unmount();

    const few = analyzeFixture(demoPlayers(5));
    render(<Harness source={few} group="ATA" mode="percentile" />);
    const row = rowOf(few.players[0].name);
    expect(shownIn(row, "G/90")).toBe("—");
    expect(label(row, "G/90")).toMatch(/: [\d,]+, poucos na posição$/);
  });

  it("colours the Nota by the fixed scale, and leaves it plain under the pool; a small group does not matter", () => {
    const label = (row: HTMLElement) => row.querySelector('[data-column-id="rating"] .sr-only')!.textContent;
    const chipIn = (row: HTMLElement) => row.querySelector('[data-column-id="rating"] [data-slot="stat-cell"]')!;
    const benched = demoPlayer(61, { name: "Pouco Jogo", minutes: 120, pos: ratings("ST") });
    const strikers = analyzeFixture([...demoPlayers(25).map((p) => ({ ...p, pos: ratings("ST") })), benched]);
    const { unmount } = render(<Harness source={strikers} group="ATA" />);
    const regular = rowOf(strikers.players[0].name);
    expect(chipIn(regular)).toHaveAttribute("data-tier", "bom");
    expect(shownIn(regular, "rating")).toBe("7,00");
    expect(label(regular)).toMatch(/^Nota média: 7,00, percentil \d+ contra os atacantes com 300\+ min$/);
    const under = rowOf("Pouco Jogo");
    expect(chipIn(under)).not.toHaveAttribute("data-tier");
    expect(shownIn(under, "rating")).toBe("7,00");
    expect(label(under)).toBe("Nota média: 7,00, amostra pequena");
    unmount();

    const few = analyzeFixture(demoPlayers(5));
    render(<Harness source={few} group="ATA" />);
    const row = rowOf(few.players[0].name);
    expect(chipIn(row)).toHaveAttribute("data-tier", "bom");
    expect(shownIn(row, "rating")).toBe("7,00");
    expect(label(row)).toBe("Nota média: 7,00");
  });

  it("shows the Nota's percentile in Percentil mode, like every other stat", () => {
    const strikers = analyzeFixture(demoPlayers(25).map((p) => ({ ...p, pos: ratings("ST") })));
    render(<Harness source={strikers} group="ATA" mode="percentile" />);
    const k = 0;
    expect(shownIn(rowOf(strikers.players[k].name), "rating")).toBe(String(Math.round(strikers.analysis.ratingPct[k])));
  });

  it("says on a chip who its percentile is against: his own position's players with the pool's minutes", () => {
    const strikers = analyzeFixture(demoPlayers(30).map((p) => ({ ...p, pos: ratings("ST") })));
    render(<Harness source={strikers} />);
    const row = rowOf(strikers.players[0].name);
    for (const id of ["G/90", "perf"]) {
      const cell = row.querySelector(`[data-column-id="${CSS.escape(id)}"]`)!;
      expect(cell.querySelector(".sr-only")!.textContent).toMatch(/, percentil \d+ contra os atacantes com 300\+ min$/);
      expect(cell.querySelector('[data-slot="stat-cell"]')!.getAttribute("title")).toMatch(
        /^percentil \d+ contra os atacantes com 300\+ min$/,
      );
    }
  });

  it("with no role picked a Performance cell is the number alone, and the Função column names the role", () => {
    const defenders = analyzeFixture(demoPlayers(30).map((p) => ({ ...p, pos: ratings("DC") })));
    render(<Harness source={defenders} fixed={["perf", "perfRole"]} />);
    const row = rowOf(defenders.players[0].name);
    expect(visibleText(row.querySelector<HTMLElement>('[data-column-id="perf"]')!)).toMatch(/^\d+$/);
    const role = row.querySelector<HTMLElement>('[data-column-id="perfRole"] [title]')!;
    expect(role.textContent).not.toBe("");
    expect(role.title).toMatch(/\((Com bola|Sem bola)\)$/);
  });

  it("shows the Função picker only while Performance is visible", async () => {
    const user = userEvent.setup();
    const defenders = analyzeFixture(demoPlayers(30).map((p) => ({ ...p, pos: ratings("DC") })));
    render(<Harness source={defenders} />);
    expect(screen.getByRole("button", { name: /^Função da coluna Performance:/ })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Opções da coluna Perf." }));
    await user.click(await screen.findByRole("menuitem", { name: /^Ocultar coluna/ }));
    expect(screen.queryByRole("button", { name: /^Função da coluna/ })).toBeNull();
  });

  it("a picked role drops the caption", () => {
    const defenders = analyzeFixture(
      demoPlayers(30).map((p) => ({ ...p, pos: ratings("DC") })),
      null,
      "ip:29",
    );
    render(<Harness source={defenders} fixed={["perf"]} />);
    const cell = rowOf(defenders.players[0].name).querySelector<HTMLElement>('[data-column-id="perf"]')!;
    expect(visibleText(cell)).toMatch(/^\d+$/);
  });

  it("says on the dash why a model number is hidden under the pool", async () => {
    const attrs = (k: number) => ATTRIBUTE_NAMES.map((_, a) => 40 + ((k * 7 + a * 3) % 50));
    const strikers = Array.from({ length: 30 }, (_, k) => demoPlayer(k, { pos: ratings("ST"), attrs: attrs(k) }));
    const benched = demoPlayer(70, { name: "Poucos Minutos", pos: ratings("ST"), minutes: 200, attrs: attrs(70) });
    const players = [...strikers, benched];
    const composites = engineComposites(defaultComposites());
    const settings = { ...DEFAULT_ENGINE_SETTINGS, fairValue: { ...DEFAULT_ENGINE_SETTINGS.fairValue, minRows: 10 } };
    const analysis = runAnalysis({ snapshot: snapshotOf(players), composites, myClubUid: 1000, settings });
    const data: TableSource = { players, analysis, composites };
    render(<Harness source={data} fixed={["fair", "valueRatio", "statsVsAbility"]} />);
    const cell = rowOf("Poucos Minutos").querySelector('[data-column-id="fair"]')!;
    expect(cell.textContent).toContain("—");
    expect(cell.querySelector(".sr-only")!.textContent).toMatch(/^Valor justo.*: amostra pequena$/);
    const played = rowOf(strikers[0].name).querySelector('[data-column-id="fair"]')!;
    expect(played.querySelector(".sr-only")).toBeNull();
    expect(Number.isNaN(analysis.statsVsAbility[players.length - 1])).toBe(false);
    expect(shownIn(rowOf("Poucos Minutos"), "statsVsAbility")).toBe("—");
    const statsVsAbility = rowOf("Poucos Minutos").querySelector('[data-column-id="statsVsAbility"] .sr-only')!;
    expect(statsVsAbility.textContent).toMatch(/: amostra pequena$/);
  });

  it("shows an empty state under the header when no row is left, with the page's way out", () => {
    const { rerender } = render(<Harness source={source} rows={new Uint32Array()} />);
    expect(screen.getByRole("heading", { name: "Nenhum jogador" })).toBeInTheDocument();
    expect(headerIds()).toContain("age");
    const clear = vi.fn();
    rerender(
      <Harness source={source} rows={new Uint32Array()} emptyActions={[{ label: "Limpar filtros", onClick: clear }]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(clear).toHaveBeenCalled();
  });

  it("says what the page's own empty list means, when it has words for it", () => {
    render(
      <Harness
        source={source}
        rows={new Uint32Array()}
        emptyDescription="Nenhum jogador subvalorizado com estes critérios."
      />,
    );
    expect(screen.getByText("Nenhum jogador subvalorizado com estes critérios.")).toBeInTheDocument();
  });

  it("sorts by the page's own default until a header is clicked", async () => {
    render(<Harness source={source} fixed={["valueRatio"]} defaultSort={{ id: "valueRatio", desc: true }} />);
    const sortOf = (id: string) => screen.getAllByRole("columnheader").find((th) => th.dataset.columnId === id)!;
    expect(sortOf("valueRatio")).toHaveAttribute("aria-sort", "descending");
    await userEvent.click(screen.getByRole("button", { name: "Idade" }));
    expect(sortOf("age")).toHaveAttribute("aria-sort", "ascending");
    expect(sortOf("valueRatio")).not.toHaveAttribute("aria-sort");
  });

  it("keeps a view's fixed columns on show: locked in Colunas, never hidden from their header", async () => {
    const user = userEvent.setup();
    const onColumnsChange = vi.fn();
    render(<Harness source={source} fixed={["valueRatio"]} onColumnsChange={onColumnsChange} />);
    await user.click(screen.getByRole("button", { name: "Colunas" }));
    const ratio = await screen.findByRole("menuitemcheckbox", { name: /^Razão / });
    expect(ratio).toHaveAttribute("aria-checked", "true");
    expect(ratio).toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Opções da coluna Razão" }));
    const hide = await screen.findByRole("menuitem", { name: /^Ocultar coluna/ });
    expect(hide).toHaveAttribute("aria-disabled", "true");
    expect(hide).toHaveTextContent("Fixa nesta visão");
    expect(onColumnsChange).not.toHaveBeenCalled();
  });

  it("counts the rows the filters keep out of every row", () => {
    render(<Harness source={source} rows={Uint32Array.of(0, 1, 2)} total={30} />);
    expect(screen.getByRole("status")).toHaveTextContent("3 de 30 jogadores");
  });

  it("each header's menu sorts and hides its column, from the keyboard too", async () => {
    const user = userEvent.setup();
    const onColumnsChange = vi.fn();
    render(<Harness source={source} group="ATA" onColumnsChange={onColumnsChange} />);
    const minutes = () => screen.getAllByRole("columnheader").find((th) => th.dataset.columnId === "minutes")!;

    screen.getByRole("button", { name: "Opções da coluna Min" }).focus();
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("menuitem", { name: "Ordenar crescente" }));
    expect(minutes()).toHaveAttribute("aria-sort", "ascending");

    await user.click(screen.getByRole("button", { name: "Opções da coluna Min" }));
    await user.click(await screen.findByRole("menuitem", { name: "Ocultar coluna" }));
    const saved = defaultColumnsFor("ATA").filter((id) => id !== "minutes");
    expect(onColumnsChange).toHaveBeenLastCalledWith({ presets: { ATA: saved }, groups: [] });
    expect(headerIds()).not.toContain("minutes");
  });

  it("opens a column's menu on a right-click over its header, and none off every column", async () => {
    render(<Harness source={source} />);
    const thead = screen.getAllByRole("rowgroup")[0];
    fireEvent.contextMenu(thead);
    await Promise.resolve();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    const minutes = screen.getAllByRole("columnheader").find((th) => th.dataset.columnId === "minutes")!;
    fireEvent.contextMenu(minutes, { clientX: 300, clientY: 100 });
    expect(await screen.findByRole("menu")).toHaveTextContent("Minutos no escopo");
  });

  it("offers filtering from a header only when the page lends its filters, and marks a filtered column", async () => {
    const user = userEvent.setup();
    const edit = vi.fn();
    const filtering: ColumnFiltering = {
      stateOf: (column) => ({ filterable: column.id !== "name", active: column.id === "age" }),
      edit,
      clear: vi.fn(),
    };
    const { unmount } = render(<Harness source={source} />);
    screen.getByRole("button", { name: "Opções da coluna Idade" }).focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("menuitem", { name: "Ordenar crescente" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /^Filtrar/ })).not.toBeInTheDocument();
    unmount();

    render(<Harness source={source} filtering={filtering} />);
    screen.getByRole("button", { name: "Opções da coluna Idade (filtrada)" }).focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("menuitem", { name: "Filtrar… (ativo)" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /comparação/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Filtrar… (ativo)" }));
    const ageHeader = screen.getAllByRole("columnheader").find((th) => th.dataset.columnId === "age");
    await vi.waitFor(() => expect(edit).toHaveBeenCalledWith(expect.objectContaining({ id: "age" }), ageHeader, false));
  });

  it("mounts only the columns within reach of the scroller, and the rest as it scrolls sideways", () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(600);
    render(<Harness source={source} group="ATA" columns={EVERY_COLUMN} />);
    const table = screen.getByRole("table");
    const count = Number(table.getAttribute("aria-colcount"));
    const colIndexes = () => screen.getAllByRole("columnheader").map((th) => Number(th.getAttribute("aria-colindex")));
    const cellIds = (row: HTMLElement) =>
      [...row.querySelectorAll<HTMLElement>("[data-column-id]")].map((c) => c.dataset.columnId);

    expect(count).toBeGreaterThan(100);
    expect(colIndexes().length).toBeLessThan(count / 2);
    expect(colIndexes()).not.toContain(count);
    expect(cellIds(bodyRows()[0])).toEqual(headerIds());

    const scroller = table.parentElement!;
    const width = Number.parseFloat(table.style.width);
    Object.defineProperty(scroller, "scrollLeft", { configurable: true, writable: true, value: width - 600 });
    fireEvent.scroll(scroller);

    expect(headerIds()[0]).toBe("name");
    expect(colIndexes()).toContain(count);
    expect(colIndexes()).not.toContain(2);
    expect(cellIds(bodyRows()[0])).toEqual(headerIds());
  });

  it("survives the column set shrinking under a window scrolled far to the right", () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(600);
    render(<Harness source={source} group="ATA" columns={EVERY_COLUMN} />);
    const table = screen.getByRole("table");
    const scroller = table.parentElement!;
    Object.defineProperty(scroller, "scrollLeft", {
      configurable: true,
      writable: true,
      value: Number.parseFloat(table.style.width) - 600,
    });
    fireEvent.scroll(scroller);

    fireEvent.click(screen.getByRole("button", { name: "Gols" }));
    expect(screen.getByRole("button", { name: "Gols" })).toHaveAttribute("aria-pressed", "true");
    const cellIds = (row: HTMLElement) =>
      [...row.querySelectorAll<HTMLElement>("[data-column-id]")].map((c) => c.dataset.columnId);
    expect(headerIds()[0]).toBe("name");
    expect(cellIds(bodyRows()[0])).toEqual(headerIds());
  });

  it("keeps the columns it had through a frame where the scroller has no width, instead of mounting all of them", () => {
    const resized: (() => void)[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resized.push(callback);
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    try {
      const width = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(600);
      render(<Harness source={source} group="ATA" columns={EVERY_COLUMN} />);
      const before = headerIds();
      expect(before.length).toBeLessThan(60);

      width.mockReturnValue(0);
      act(() => {
        for (const callback of resized) callback();
      });
      expect(headerIds()).toEqual(before);

      width.mockReturnValue(600);
      act(() => {
        for (const callback of resized) callback();
      });
      expect(headerIds()).toEqual(before);

      const scroller = screen.getByRole("table").parentElement!;
      Object.defineProperty(scroller, "scrollLeft", { configurable: true, writable: true, value: 9000 });
      fireEvent.scroll(scroller);
      width.mockReturnValue(0);
      act(() => {
        for (const callback of resized) callback();
      });
      fireEvent.click(screen.getByRole("button", { name: "Gols" }));
      expect(headerIds()[0]).toBe("name");
      expect(headerIds().length).toBeLessThan(20);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("gives every header control a role, a name and its state: sort buttons, menu buttons and the select-all box", () => {
    fitEveryColumn();
    render(<Harness source={source} group="ATA" selectionActions={[]} />);
    for (const control of headerControls()) {
      const slot = control.dataset.headerSlot;
      expect(control).toHaveAccessibleName();
      if (slot === "select") {
        expect(control).toHaveRole("checkbox");
        expect(control).not.toBeChecked();
        expect(control).not.toBePartiallyChecked();
      } else {
        expect(control.tagName).toBe("BUTTON");
        if (slot === "menu") {
          expect(control).toHaveAttribute("aria-haspopup", "menu");
          expect(control).toHaveAttribute("aria-expanded", "false");
        }
      }
    }
    const sorted = screen.getAllByRole("columnheader").filter((th) => th.hasAttribute("aria-sort"));
    expect(sorted).toHaveLength(1);
  });

  it("gives the header one tab stop and moves along its controls with the arrows", () => {
    render(<Harness source={source} group="ATA" />);
    const stops = () => headerControls().filter((c) => c.tabIndex === 0);
    expect(stops()).toHaveLength(1);
    expect(stops()[0]).toHaveAccessibleName("Nome");

    stops()[0].focus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(document.activeElement).toHaveAccessibleName("Opções da coluna Nome");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    const second = defaultColumnsFor("ATA")[0];
    expect(document.activeElement!.closest("th")).toHaveAttribute("data-column-id", second);
    expect(stops()).toEqual([document.activeElement]);

    fireEvent.keyDown(document.activeElement!, { key: "End" });
    const last = defaultColumnsFor("ATA").at(-1)!;
    expect(document.activeElement!.closest("th")).toHaveAttribute("data-column-id", last);
    expect(document.activeElement).toHaveAttribute("data-header-slot", "menu");
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(document.activeElement).toHaveAccessibleName("Nome");
    expect(stops()).toEqual([document.activeElement]);
  });

  it("leaves header arrows held with a modifier to the browser and the system", () => {
    render(<Harness source={source} group="ATA" />);
    const name = headerControls()[0];
    name.focus();
    for (const modifier of ["altKey", "metaKey", "ctrlKey"] as const) {
      const passed = fireEvent.keyDown(name, { key: "ArrowRight", [modifier]: true });
      expect(passed, modifier).toBe(true);
      expect(name).toHaveFocus();
    }
  });

  it("keeps the header's tab stop mounted after its column scrolled out of the window", () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(600);
    render(<Harness source={source} group="ATA" columns={EVERY_COLUMN} />);
    const table = screen.getByRole("table");
    headerControls()[0].focus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    const stop = document.activeElement!.closest("th")!.dataset.columnId;

    const scroller = table.parentElement!;
    Object.defineProperty(scroller, "scrollLeft", {
      configurable: true,
      writable: true,
      value: Number.parseFloat(table.style.width) - 600,
    });
    fireEvent.scroll(scroller);
    expect(headerIds()).toContain(stop);
    expect(
      headerControls()
        .filter((c) => c.tabIndex === 0)
        .map((c) => c.closest("th")!.dataset.columnId),
    ).toEqual([stop]);
  });

  it("worst-case dataset renders", { timeout: 30_000 }, async () => {
    fitEveryColumn();
    const worst = worstCasePlayers();
    const data = analyzeFixture([...worst, ...demoPlayers(30)]);
    render(<Harness source={data} group="ATA" columns={EVERY_COLUMN} />);
    const table = screen.getByRole("table");

    for (const mode of ["Valor", "Percentil"]) {
      await userEvent.click(screen.getByRole("radio", { name: mode }));
      expect(table.textContent).not.toMatch(/NaN|undefined|null|Infinity/);
      for (const p of worst) expect(rowOf(p.name)).toBeDefined();
    }

    const long = worst[0].name;
    const nameCell = within(rowOf(long)).getByText(long);
    expect(nameCell).toHaveAttribute("title", long);
    expect(nameCell).toHaveClass("truncate");

    const freeAgent = rowOf("Tifany Hoyos");
    expect(within(freeAgent).getByText("Sem clube")).toBeInTheDocument();
    expect(shownIn(freeAgent, "value")).toBe("—");
    expect(shownIn(freeAgent, "contract_end")).toBe("—");
    expect(shownIn(freeAgent, "wage")).toBe("—");
    expect(shownIn(freeAgent, "minutes")).toBe("0");
    expect(shownIn(freeAgent, "G/90")).toBe("—");
    expect(shownIn(rowOf("Jô"), "age")).toBe("—");
    expect(shownIn(rowOf("Zak O’Keefe"), "value")).toBe("—");
    expect(shownIn(rowOf("Tseren Khaliun"), "value")).toBe("—");
    expect(shownIn(rowOf("Iván D’Angelo"), "value")).toBe("£289,6M");
    expect(shownIn(rowOf("Iván D’Angelo"), "minutes")).toBe("4.590");
    const positions = within(rowOf("Oliver Michael Sherring-Bance")).getByText(/DL, DC, DR/);
    expect(positions).toHaveClass("truncate");
    expect(positions).toHaveAttribute("title", positions.textContent);
  });
});

describe("PlayerTable selection", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(2000);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1200);
  });
  afterEach(() => vi.restoreAllMocks());

  const source = analyzeFixture(demoPlayers(30));
  const NO_ACTIONS: readonly SelectionAction[] = [];
  const SHORTLIST_ONLY: readonly SelectionAction[] = ["shortlist"];
  const checkOf = (row: HTMLElement) => within(row).getByRole("checkbox");
  const bar = () => screen.queryByRole("toolbar", { name: "Seleção" });
  const checkedPositions = () =>
    bodyRows()
      .filter((r) => r.hasAttribute("data-checked"))
      .map((r) => r.dataset.position);
  const rowByUid = (uid: number) => bodyRows().find((r) => r.dataset.player === String(uid))!;

  it("has no checkboxes unless the page asks for selection", () => {
    render(<Harness source={source} />);
    expect(screen.queryAllByRole("checkbox")).toEqual([]);
    expect(bar()).toBeNull();
  });

  it("a row's checkbox selects it without opening the panel, and a click elsewhere on the row still opens it", async () => {
    const user = userEvent.setup();
    const onOpenPlayer = vi.fn();
    render(<Harness source={source} onOpenPlayer={onOpenPlayer} selectionActions={NO_ACTIONS} />);
    const row = bodyRows()[1];
    const name = source.players.find((p) => String(p.uid) === row.dataset.player)!.name;
    expect(checkOf(row)).toHaveAccessibleName(`Selecionar ${name}`);

    await user.click(checkOf(row));
    expect(checkOf(row)).toBeChecked();
    expect(row).toHaveAttribute("data-checked");
    expect(onOpenPlayer).not.toHaveBeenCalled();
    expect(bar()).toHaveTextContent("1 selecionado");

    await user.click(within(row).getByText(name));
    expect(onOpenPlayer).toHaveBeenCalledWith(Number(row.dataset.player));
    expect(checkOf(row)).toBeChecked();
  });

  it("shift-click selects every row between the last one clicked and this one", async () => {
    const user = userEvent.setup();
    render(<Harness source={source} selectionActions={NO_ACTIONS} />);
    await user.click(checkOf(bodyRows()[1]));
    await user.keyboard("{Shift>}");
    await user.click(checkOf(bodyRows()[4]));
    await user.keyboard("{/Shift}");
    expect(checkedPositions()).toEqual(["1", "2", "3", "4"]);
    expect(bar()).toHaveTextContent("4 selecionados");
  });

  it("the header checkbox selects every row on show, reads mixed for some, and clears them", async () => {
    const user = userEvent.setup();
    render(<Harness source={source} rows={Uint32Array.of(0, 1, 2, 3)} total={30} selectionActions={NO_ACTIONS} />);
    const all = screen.getByRole("checkbox", { name: "Selecionar todos os visíveis" });
    expect(all).not.toBeChecked();
    expect(all).not.toBePartiallyChecked();
    await user.click(checkOf(bodyRows()[0]));
    expect(all).toBePartiallyChecked();
    await user.click(all);
    expect(all).toBeChecked();
    expect(bar()).toHaveTextContent("4 selecionados");
    await user.click(all);
    expect(all).not.toBeChecked();
    expect(all).not.toBePartiallyChecked();
    await vi.waitFor(() => expect(bar()).toBeNull());
  });

  it("keeps the selection through a sort and a filter, and says how many the filter hides", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness source={source} selectionActions={NO_ACTIONS} />);
    const [first, second] = [bodyRows()[0], bodyRows()[1]].map((r) => Number(r.dataset.player));
    await user.click(checkOf(rowByUid(first)));
    await user.click(checkOf(rowByUid(second)));

    await user.click(screen.getByRole("button", { name: "Idade" }));
    expect(rowByUid(first)).toHaveAttribute("data-checked");
    expect(rowByUid(second)).toHaveAttribute("data-checked");

    const keep = Uint32Array.from(allRows(30).filter((i) => source.players[i].uid !== first));
    rerender(<Harness source={source} rows={keep} total={30} selectionActions={NO_ACTIONS} />);
    expect(bar()).toHaveTextContent("2 selecionados");
    expect(bar()).toHaveTextContent("1 fora da lista");
  });

  it("Space toggles the focused row, Enter still opens it, and Escape clears the selection", () => {
    const onOpenPlayer = vi.fn();
    render(<Harness source={source} onOpenPlayer={onOpenPlayer} selectionActions={NO_ACTIONS} />);
    const row = bodyRows()[0];
    row.focus();
    fireEvent.keyDown(row, { key: " " });
    expect(row).toHaveAttribute("data-checked");
    expect(onOpenPlayer).not.toHaveBeenCalled();
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onOpenPlayer).toHaveBeenCalledWith(Number(row.dataset.player));

    const escapeNotPrevented = fireEvent.keyDown(row, { key: "Escape" });
    expect(escapeNotPrevented).toBe(false);
    expect(row).not.toHaveAttribute("data-checked");
    expect(bar()).toBeNull();
  });

  it("the bar's Limpar clears the selection and Escape inside the bar does too, handing focus back to the table", async () => {
    const user = userEvent.setup();
    render(<Harness source={source} selectionActions={NO_ACTIONS} />);
    await user.click(checkOf(bodyRows()[2]));
    await user.click(within(bar()!).getByRole("button", { name: "Limpar seleção" }));
    expect(checkedPositions()).toEqual([]);

    await user.click(checkOf(bodyRows()[3]));
    within(bar()!).getByRole("button", { name: "Limpar seleção" }).focus();
    await user.keyboard("{Escape}");
    expect(checkedPositions()).toEqual([]);
    expect(bar()).toBeNull();
    expect(document.activeElement).toBe(bodyRows().find((r) => r.tabIndex === 0));
  });

  it("offers no select-all while no row is on show", () => {
    const { rerender } = render(
      <Harness source={source} rows={new Uint32Array()} total={30} selectionActions={NO_ACTIONS} />,
    );
    const all = screen.getByRole("checkbox", { name: "Selecionar todos os visíveis" });
    expect(all).toHaveAttribute("aria-disabled", "true");
    rerender(<Harness source={source} rows={Uint32Array.of(0, 1)} total={30} selectionActions={NO_ACTIONS} />);
    expect(screen.getByRole("checkbox", { name: "Selecionar todos os visíveis" })).not.toHaveAttribute("aria-disabled");
  });

  it("tells assistive tech which rows are selected, only where rows can be", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness source={source} />);
    expect(bodyRows()[0]).not.toHaveAttribute("aria-selected");
    unmount();
    render(<Harness source={source} selectionActions={NO_ACTIONS} />);
    expect(bodyRows()[0]).toHaveAttribute("aria-selected", "false");
    await user.click(checkOf(bodyRows()[0]));
    expect(bodyRows()[0]).toHaveAttribute("aria-selected", "true");
  });

  it("forgets a selected player a reload no longer has, even when a later reload brings him back", () => {
    const players = source.players;
    const { rerender } = render(<Harness source={source} selectionActions={NO_ACTIONS} />);
    const [gone, kept] = [bodyRows()[0], bodyRows()[1]].map((r) => Number(r.dataset.player));
    fireEvent.click(checkOf(rowByUid(gone)));
    fireEvent.click(checkOf(rowByUid(kept)));
    expect(bar()).toHaveTextContent("2 selecionados");

    const reloaded = analyzeFixture(players.filter((p) => p.uid !== gone));
    rerender(<Harness source={reloaded} selectionActions={NO_ACTIONS} />);
    expect(bar()).toHaveTextContent("1 selecionado");
    rerender(<Harness source={analyzeFixture([...players])} selectionActions={NO_ACTIONS} />);
    expect(rowByUid(gone)).not.toHaveAttribute("data-checked");
    expect(bar()).toHaveTextContent("1 selecionado");
  });

  it("Escape clears the selection from anywhere on the page but a text field or an open overlay", async () => {
    const user = userEvent.setup();
    render(
      <>
        <input aria-label="Campo" />
        <button type="button">Outro botão</button>
        <Harness source={source} selectionActions={NO_ACTIONS} />
      </>,
    );
    await user.click(checkOf(bodyRows()[0]));
    screen.getByRole("textbox", { name: "Campo" }).focus();
    await user.keyboard("{Escape}");
    expect(bar()).toHaveTextContent("1 selecionado");

    screen.getByRole("button", { name: "Outro botão" }).focus();
    await user.keyboard("{Escape}");
    expect(checkedPositions()).toEqual([]);

    await user.click(checkOf(bodyRows()[1]));
    (document.activeElement as HTMLElement).blur();
    await user.keyboard("{Escape}");
    expect(checkedPositions()).toEqual([]);
  });

  it("Escape with the bar's Shortlist menu open closes the menu and keeps the selection", async () => {
    const user = userEvent.setup();
    appStore.getState().createFolder("Laterais");
    try {
      render(<Harness source={source} selectionActions={SHORTLIST_ONLY} />);
      await user.click(checkOf(bodyRows()[0]));
      await user.click(within(bar()!).getByRole("button", { name: "Shortlist" }));
      expect(await screen.findByRole("menu")).toBeInTheDocument();
      await user.keyboard("{Escape}");
      await vi.waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
      expect(bar()).toHaveTextContent("1 selecionado");
    } finally {
      resetApp();
    }
  });

  it("stripes the rows by their place in the order shown, whatever the sort", async () => {
    render(<Harness source={source} />);
    const odd = () => bodyRows().map((r) => [r.dataset.position, r.hasAttribute("data-odd")]);
    expect(odd().slice(0, 4)).toEqual([
      ["0", false],
      ["1", true],
      ["2", false],
      ["3", true],
    ]);
    await userEvent.click(screen.getByRole("button", { name: "Idade" }));
    expect(odd().slice(0, 4)).toEqual([
      ["0", false],
      ["1", true],
      ["2", false],
      ["3", true],
    ]);
  });
});
