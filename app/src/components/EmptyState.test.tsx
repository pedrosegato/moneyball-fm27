import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("names the empty view and offers the way out", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <EmptyState
        title="Nenhum jogador neste recorte"
        description="Os filtros ativos não deixam ninguém passar."
        action={<Button onClick={onClear}>Limpar filtros</Button>}
      />,
    );
    expect(screen.getByRole("heading", { name: "Nenhum jogador neste recorte" })).toBeInTheDocument();
    expect(screen.getByText("Os filtros ativos não deixam ninguém passar.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
