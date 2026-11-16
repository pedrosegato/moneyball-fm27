import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { emptyFilters } from "@/store/filters";
import { appStore } from "@/store/index";
import { buildColumns } from "@/table/columns/build";
import { analyzeFixture, demoPlayers } from "@/table/fixtures";
import { filterTargets } from "../lib/targets";
import { FilterBar } from "./FilterBar";

const targets = filterTargets(buildColumns(analyzeFixture(demoPlayers(30))));

describe("FilterBar", () => {
  afterEach(() => appStore.setState(appStore.getInitialState(), true));

  it("marks a filter the analysis cannot apply instead of claiming it, and still drops it", async () => {
    const user = userEvent.setup();
    act(() =>
      appStore.setState({
        filters: {
          ...emptyFilters(),
          scout: [
            { col: "age", kind: "range", max: 23 },
            { col: "minha-composta", kind: "range", min: 3 },
          ],
        },
      }),
    );
    render(<FilterBar table="scout" targets={targets} applied={new Set(["age"])} onEdit={() => {}} />);
    expect(screen.getByRole("button", { name: "Editar filtro Idade ≤ 23" })).toBeInTheDocument();
    const stale = screen.getByRole("button", { name: "Remover filtro minha-composta ≥ 3 (inválido)" });
    expect(screen.queryByRole("button", { name: /^Editar filtro minha-composta/ })).not.toBeInTheDocument();
    await user.click(stale);
    expect(appStore.getState().filters.scout).toEqual([{ col: "age", kind: "range", max: 23 }]);
  });
});
