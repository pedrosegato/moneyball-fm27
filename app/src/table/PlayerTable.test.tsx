import { act, screen, within } from "@testing-library/react";
import { snapshotOf } from "@/engine/testing/records";
import { renderWithData, resetApp, startData } from "@/shell/testing";
import { FILTER_TABLES, type FilterTable } from "@/store/filters";
import { appStore } from "@/store/index";
import { fakeSource } from "@/store/testing";
import { useData } from "@/store/useData";
import { demoPlayer, demoPlayers, ratings } from "./fixtures";
import { usePlayerColumns } from "./hooks/usePlayerColumns";
import { PlayerTable } from "./PlayerTable";

const players = [...demoPlayers(24), demoPlayer(40, { name: "Goleiro Titular", pos: ratings("GK") })];
const snapshot = snapshotOf(players);

function AnyTable({ table }: { table: FilterTable }) {
  const { snapshot: data, analysis } = useData();
  const { composites, columns } = usePlayerColumns(data?.players, analysis);
  if (!data || !analysis || !columns) return null;
  const rows = Uint32Array.from(data.players, (_, i) => i);
  return (
    <PlayerTable
      table={table}
      rows={rows}
      players={data.players}
      analysis={analysis}
      composites={composites}
      columns={columns}
    />
  );
}

const status = () => within(screen.getByRole("region", { name: "Tabela de jogadores" })).getByRole("status");

describe("PlayerTable", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(2000);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1200);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetApp();
  });

  it.each(FILTER_TABLES)("gives the %s list the same controls as every other list", async (table) => {
    const { controller } = startData(fakeSource(snapshot));
    renderWithData(<AnyTable table={table} />, controller);
    await vi.waitFor(() => expect(status()).toHaveTextContent("25 jogadores"));
    expect(screen.getByRole("searchbox", { name: "Buscar nesta lista" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Período: / })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Posição: / })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Filtros/ })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Peso da liga na Performance" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Exibição" })).toBeInTheDocument();
  });

  it.each(FILTER_TABLES)("hides from the %s list only the rows its own filters leave out", async (table) => {
    const { controller } = startData(fakeSource(snapshot));
    renderWithData(<AnyTable table={table} />, controller);
    await vi.waitFor(() => expect(status()).toHaveTextContent("25 jogadores"));
    const other = FILTER_TABLES.find((t) => t !== table)!;
    act(() => appStore.getState().setFilter(other, { col: "naturalPositions", kind: "set", values: ["GK"] }));
    act(() => appStore.getState().setFilter(table, { col: "naturalPositions", kind: "set", values: ["GK"] }));
    await vi.waitFor(() => expect(status()).toHaveTextContent("1 de 25 jogadores"));
  });
});
