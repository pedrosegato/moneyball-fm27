import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PitchMap } from "./PitchMap";

describe("PitchMap", () => {
  it("renders counts per position", () => {
    render(<PitchMap mode="counts" counts={{ DC: 2, ST: 1 }} label="Carrinho por posição" />);
    const pitch = screen.getByRole("list", { name: "Carrinho por posição" });
    expect(within(pitch).getAllByRole("listitem")).toHaveLength(15);

    const dc = screen.getByLabelText("Zagueiro (DC): 2 jogadores");
    expect(dc).toHaveTextContent("2");
    expect(screen.getByLabelText("Atacante (ST): 1 jogador")).toHaveTextContent("1");
    expect(screen.getByLabelText("Goleiro (GK): nenhum jogador")).toHaveTextContent("0");
  });

  it("names who makes a count, on hover and keyboard focus", async () => {
    render(
      <TooltipProvider delay={0}>
        <PitchMap
          mode="counts"
          counts={{ DC: 2 }}
          names={{ DC: ["Zé Roberto", "김민재"] }}
          label="Carrinho por posição"
        />
      </TooltipProvider>,
    );
    const dc = screen.getByLabelText("Zagueiro (DC): 2 jogadores (Zé Roberto, 김민재)");
    expect(dc).toBeInstanceOf(HTMLButtonElement);
    expect(screen.getByLabelText("Atacante (ST): nenhum jogador")).not.toHaveAttribute("tabindex");
    await userEvent.tab();
    expect(dc).toHaveFocus();
    expect(await screen.findByText("김민재")).toBeInTheDocument();
  });

  it("highlights a player's positions", () => {
    render(<PitchMap mode="highlight" levels={{ AMR: "natural", MR: "secundaria" }} />);
    expect(screen.getByLabelText("Ponta direita (AMR): natural")).toHaveAttribute("data-level", "natural");
    expect(screen.getByLabelText("Meia direita (MR): secundária")).toHaveAttribute("data-level", "secundaria");
    expect(screen.getByLabelText("Goleiro (GK)")).toHaveAttribute("data-level", "none");
  });
});
