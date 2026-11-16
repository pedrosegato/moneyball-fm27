import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CriteriaFieldset } from "./CriteriaFieldset";
import { CriteriaPopover } from "./CriteriaPopover";

function Criteria({ changed, onRestore }: { changed: boolean; onRestore(): void }) {
  return (
    <CriteriaPopover changed={changed}>
      <CriteriaFieldset title="Critérios do Moneyball" changed={changed} onRestore={onRestore}>
        <p>Razão ≥</p>
      </CriteriaFieldset>
    </CriteriaPopover>
  );
}

describe("CriteriaPopover", () => {
  it("opens the criteria from a trigger that says when they were changed", async () => {
    const onRestore = vi.fn();
    render(<Criteria changed onRestore={onRestore} />);
    await userEvent.click(screen.getByRole("button", { name: /^Critérios\s?\(alterados\)$/ }));
    expect(await screen.findByRole("group", { name: "Critérios do Moneyball" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Restaurar padrões" }));
    expect(onRestore).toHaveBeenCalledOnce();
  });

  it("offers no restore while the criteria are the defaults", async () => {
    render(<Criteria changed={false} onRestore={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Critérios" }));
    expect(await screen.findByRole("group", { name: "Critérios do Moneyball" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restaurar padrões" })).not.toBeInTheDocument();
  });
});
