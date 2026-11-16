import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterChip } from "./FilterChip";

describe("FilterChip", () => {
  it("removes the filter through a named button", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<FilterChip label="Idade ≤ 23" onRemove={onRemove} />);
    expect(screen.getByText("Idade ≤ 23")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remover filtro Idade ≤ 23" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("opens the filter for editing from its label, which names the whole filter even when cut", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const label = "Liga: Segunda Divisão Distrital do Porto Série 2";
    render(<FilterChip label={label} onEdit={onEdit} onRemove={() => {}} />);
    const edit = screen.getByRole("button", { name: `Editar filtro ${label}` });
    expect(edit).toHaveAttribute("title", label);
    await user.click(edit);
    expect(onEdit).toHaveBeenCalledWith(edit, false);
  });
});
