import { render, screen, within } from "@testing-library/react";
import { TierLegend } from "./TierLegend";

describe("TierLegend", () => {
  it("lists the five tiers best first, each chip in its own colour beside the percentiles it covers", () => {
    render(<TierLegend />);
    const items = within(screen.getByRole("list", { name: "Níveis de qualidade" })).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "Elite90–100",
      "Bom70–89",
      "Mediano40–69",
      "Abaixo20–39",
      "Ruim0–19",
    ]);
    expect(within(items[0]).getByText("Elite")).toHaveClass("bg-tier-elite");
    expect(within(items[4]).getByText("Ruim")).toHaveClass("bg-tier-ruim");
  });

  it("counts the players in each tier when it legends a chart, the percentiles moving to the tooltip", () => {
    render(<TierLegend label="Níveis no gráfico" counts={{ elite: 1, bom: 1_204, mediano: 0, abaixo: 3, ruim: 12 }} />);
    const items = within(screen.getByRole("list", { name: "Níveis no gráfico" })).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "Elite1 jogador",
      "Bom1.204 jogadores",
      "Mediano0 jogadores",
      "Abaixo3 jogadores",
      "Ruim12 jogadores",
    ]);
    expect(items[0]).toHaveAttribute("title", "Elite: percentil 90–100");
  });

  it("speaks the difference scale when it legends a comparison", () => {
    render(<TierLegend scale="delta" />);
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Elite+20 ou mais",
      "Bom+5 a +19",
      "Mediano−4 a +4",
      "Abaixo−5 a −19",
      "Ruim−20 ou menos",
    ]);
  });
});
