import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CountSegmentedControl } from "./CountSegmentedControl";

describe("CountSegmentedControl", () => {
  it("shows each option with its count and an option for all", async () => {
    const onValueChange = vi.fn();
    render(
      <CountSegmentedControl
        aria-label="Movimento"
        value="all"
        onValueChange={onValueChange}
        all={{ value: "all", count: 1500 }}
        segments={[
          { value: "buy", label: "Compras", count: 1200 },
          { value: "sell", label: "Vendas", count: 300, title: "Do seu clube" },
        ]}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Movimento" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Todos 1500" })).toHaveTextContent("Todos 1.500");
    expect(screen.getByRole("radio", { name: "Compras 1200" })).toHaveTextContent("Compras 1.200");
    expect(screen.getByRole("radio", { name: "Vendas 300" })).toHaveAttribute("title", "Do seu clube");

    await userEvent.click(screen.getByRole("radio", { name: "Vendas 300" }));
    expect(onValueChange).toHaveBeenCalledWith("sell");
  });

  it("can name the all option and leave its count out", () => {
    render(
      <CountSegmentedControl
        aria-label="Veredito"
        value="all"
        onValueChange={() => {}}
        all={{ value: "all", count: 9, ariaLabel: "Todos os vereditos 9", hideCount: true }}
        segments={[{ value: "keep", label: "Manter", count: 9 }]}
      />,
    );
    expect(screen.getByRole("radio", { name: "Todos os vereditos 9" })).toHaveTextContent(/^Todos$/);
  });
});
