import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FilterSpec } from "@/engine/universe";
import { buildColumns } from "@/table/columns/build";
import { analyzeFixture, demoPlayers, ratings } from "@/table/fixtures";
import type { FilterData } from "../lib/editor";
import { filterTarget } from "../lib/targets";
import { ColumnFilterEditor } from "./ColumnFilterEditor";

const source = analyzeFixture(demoPlayers(30).map((p) => ({ ...p, pos: ratings("ST") })));
const columns = buildColumns(source);
const data: FilterData = { players: source.players, analysis: source.analysis, gameDate: "2026-11-14" };
const target = (id: string, mode: "value" | "percentile" = "value") =>
  filterTarget(columns.find((c) => c.id === id)!, mode)!;

async function confirm(user: ReturnType<typeof userEvent.setup>, name: "Mínimo" | "Máximo") {
  const field = screen.getByRole("textbox", { name });
  const shown = (field as HTMLInputElement).value;
  await user.clear(field);
  await user.type(field, `${shown}{Enter}`);
}

describe("ColumnFilterEditor", () => {
  it.each<[string, "value" | "percentile", FilterSpec]>([
    ["age", "value", { col: "age", kind: "range", max: 23 }],
    ["minutes", "value", { col: "minutes", kind: "range", min: 1200, max: 3000 }],
    ["G/90", "percentile", { col: "pct:G/90", kind: "range", min: 75 }],
  ])("confirming %s's bounds as they stand saves the identical filter", async (id, mode, spec) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColumnFilterEditor target={target(id, mode)} filter={spec} data={data} onChange={onChange} />);
    await confirm(user, "Mínimo");
    expect(onChange).toHaveBeenLastCalledWith(spec);
    await confirm(user, "Máximo");
    expect(onChange).toHaveBeenLastCalledWith(spec);
  });

  it("leaves a contract filter alone when its dates are only visited", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const spec: FilterSpec = { col: "contract_end", kind: "dateRange", to: "2029-06-30" };
    render(<ColumnFilterEditor target={target("contract_end")} filter={spec} data={data} onChange={onChange} />);
    await user.click(screen.getByLabelText("De"));
    await user.keyboard("{Enter}");
    await user.click(screen.getByLabelText("Até"));
    await user.keyboard("{Enter}");
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("draws a stat's bars over the players with the pool's minutes, and the minutes' bars over every player", () => {
    const players = demoPlayers(32).map((p, k) => ({
      ...p,
      pos: ratings("ST"),
      season: k < 30 ? p.season : { ...p.season!, minutes: 120 },
    }));
    const benched = analyzeFixture(players);
    const benchedColumns = buildColumns(benched);
    const benchedData: FilterData = { players, analysis: benched.analysis, gameDate: "2026-11-14" };
    const of = (id: string) => filterTarget(benchedColumns.find((c) => c.id === id)!, "value")!;
    const goals = benched.analysis.cols["Shots/90"];
    const inPool = Array.from(goals).filter((v, i) => benched.analysis.pool[i] && !Number.isNaN(v)).length;
    expect(inPool).toBeLessThan(Array.from(goals).filter((v) => !Number.isNaN(v)).length);

    const { unmount } = render(
      <ColumnFilterEditor target={of("Shots/90")} filter={undefined} data={benchedData} onChange={() => {}} />,
    );
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(
      new RegExp(`^Distribuição de ${inPool} valores dos jogadores com 300\\+ min entre`),
    );
    unmount();
    render(<ColumnFilterEditor target={of("minutes")} filter={undefined} data={benchedData} onChange={() => {}} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/^Distribuição de 32 valores entre/);
  });
});
