import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STATS, type StatDef } from "@/engine/stats/catalog";
import { DeltaCell } from "./DeltaCell";
import { ScoreCell } from "./ScoreCell";
import { StatCell } from "./StatCell";

const stat = (key: string): StatDef => {
  const def = STATS.find((s) => s.key === key);
  if (!def) throw new Error(`missing ${key}`);
  return def;
};
const npxg = stat("npxG/90");

function chip(description: string | RegExp) {
  const text = screen.getByText(description);
  expect(text).toHaveClass("sr-only");
  const cell = text.closest<HTMLElement>('[data-slot="stat-cell"]');
  if (!cell) throw new Error("stat cell not found");
  return { cell, shown: cell.querySelector('[aria-hidden="true"]')?.textContent };
}

describe("StatCell", () => {
  it('shows "—" for NaN and a screen-reader label with full stat name', () => {
    render(<StatCell value={NaN} pct={NaN} mode="percentile" def={npxg} />);
    const { cell, shown } = chip("Gols esperados sem pênalti (npxG) por 90: sem dados");
    expect(shown).toBe("—");
    expect(cell).not.toHaveTextContent("NaN");
  });

  it("shows the percentile in percentile mode and the stat in value mode", () => {
    const { rerender } = render(<StatCell value={0.4123} pct={91} mode="percentile" def={npxg} />);
    expect(chip("Gols esperados sem pênalti (npxG) por 90: 0,41, percentil 91").shown).toBe("91");

    rerender(<StatCell value={0.4123} pct={91} mode="value" def={npxg} />);
    expect(chip("Gols esperados sem pênalti (npxG) por 90: 0,41, percentil 91").shown).toBe("0,41");
  });

  it("keeps the number visible when only the percentile is missing", () => {
    render(<StatCell value={0.4123} pct={NaN} mode="value" def={npxg} missing="group" />);
    expect(chip("Gols esperados sem pênalti (npxG) por 90: 0,41, poucos na posição").shown).toBe("0,41");
  });

  it("says who its percentile is against, in the tooltip and to screen readers", async () => {
    const user = userEvent.setup();
    const against = "contra os atacantes com 300+ min";
    render(<StatCell value={0.4123} pct={87} mode="value" def={npxg} against={against} />);
    const { cell, shown } = chip(`Gols esperados sem pênalti (npxG) por 90: 0,41, percentil 87 ${against}`);
    expect(shown).toBe("0,41");
    await user.hover(cell);
    expect(
      await screen.findByText(
        "percentil 87 contra os atacantes com 300+ min",
        { selector: ":not(.sr-only)" },
        { timeout: 2000 },
      ),
    ).toBeInTheDocument();
  });

  it("in a table cell, says who its percentile is against in a native title instead of a tooltip", () => {
    const against = "contra os atacantes com 300+ min";
    render(<StatCell value={0.4123} pct={87} mode="value" def={npxg} against={against} againstAsTitle />);
    const { cell, shown } = chip(`Gols esperados sem pênalti (npxG) por 90: 0,41, percentil 87 ${against}`);
    expect(shown).toBe("0,41");
    expect(cell).toHaveAttribute("title", `percentil 87 ${against}`);
    expect(cell).not.toHaveAttribute("data-base-ui-tooltip-trigger");
  });

  it("in a table cell, still explains a missing percentile with its tooltip", async () => {
    const user = userEvent.setup();
    render(
      <StatCell
        value={0.4123}
        pct={NaN}
        mode="percentile"
        def={npxg}
        missing="pool"
        against="contra os atacantes com 300+ min"
        againstAsTitle
      />,
    );
    const { cell, shown } = chip("Gols esperados sem pênalti (npxG) por 90: 0,41, amostra pequena");
    expect(shown).toBe("—");
    expect(cell).not.toHaveAttribute("title");
    await user.hover(cell);
    expect(
      await screen.findByText("amostra pequena", { selector: ":not(.sr-only)" }, { timeout: 2000 }),
    ).toBeInTheDocument();
  });

  it("says why there is no percentile rather than who it would be against", () => {
    render(
      <StatCell
        value={0.4123}
        pct={NaN}
        mode="value"
        def={npxg}
        missing="pool"
        against="contra os atacantes com 300+ min"
      />,
    );
    expect(chip("Gols esperados sem pênalti (npxG) por 90: 0,41, amostra pequena").shown).toBe("0,41");
  });

  it.each([
    ["pool", "amostra pequena"],
    ["group", "poucos na posição"],
  ] as const)(
    'explains a percentile left out for "%s" with the "%s" tooltip, the number still shown',
    async (missing, text) => {
      const user = userEvent.setup();
      const { rerender } = render(<StatCell value={0.4123} pct={NaN} mode="value" def={npxg} missing={missing} />);
      expect(chip(`Gols esperados sem pênalti (npxG) por 90: 0,41, ${text}`).shown).toBe("0,41");
      rerender(<StatCell value={0.4123} pct={NaN} mode="percentile" def={npxg} missing={missing} />);
      const { cell, shown } = chip(`Gols esperados sem pênalti (npxG) por 90: 0,41, ${text}`);
      expect(shown).toBe("—");
      await user.hover(cell);
      expect(await screen.findByText(text, { selector: ":not(.sr-only)" }, { timeout: 2000 })).toBeInTheDocument();
    },
  );

  it('explains a small sample with the "amostra pequena" tooltip', async () => {
    const user = userEvent.setup();
    render(<StatCell value={NaN} pct={NaN} mode="percentile" def={npxg} missing="sample" />);
    const { cell, shown } = chip("Gols esperados sem pênalti (npxG) por 90: amostra pequena");
    expect(shown).toBe("—");
    await user.hover(cell);
    expect(await screen.findByText("amostra pequena", {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it.each([
    [95, "elite"],
    [75, "bom"],
    [50, "mediano"],
    [25, "abaixo"],
    [5, "ruim"],
  ] as const)("fills a percentile of %i with the %s tier, in either mode", (pct, tier) => {
    const { rerender } = render(<StatCell value={0.4123} pct={pct} mode="percentile" def={npxg} />);
    const { cell } = chip(new RegExp(`percentil ${pct}$`));
    expect(cell).toHaveAttribute("data-tier", tier);
    expect(cell).toHaveClass(`bg-tier-${tier}`, `text-tier-${tier}-ink`);

    rerender(<StatCell value={0.4123} pct={pct} mode="value" def={npxg} />);
    expect(cell).toHaveAttribute("data-tier", tier);
  });

  it("leaves a chip without a percentile unfilled", () => {
    render(<StatCell value={0.4123} pct={NaN} mode="value" def={npxg} missing="group" />);
    const { cell } = chip(/poucos na posição/);
    expect(cell).not.toHaveAttribute("data-tier");
    expect(cell.className).not.toMatch(/bg-tier-/);
    expect(cell).toHaveClass("border-dashed");
  });

  it("says when lower is better", () => {
    render(<StatCell value={1.2} pct={80} mode="value" def={stat("PossLost/90")} />);
    expect(chip("Posses perdidas por 90 (menor é melhor): 1,20, percentil 80").shown).toBe("1,20");
  });
});

const whole = (v: number) => String(Math.round(v));
const signedWhole = (v: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0, signDisplay: "exceptZero" }).format(v);
const signedTenth = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(v);

describe("ScoreCell", () => {
  it.each([
    [96, "elite"],
    [74, "bom"],
    [41, "mediano"],
    [39, "abaixo"],
    [3, "ruim"],
  ] as const)("prints a score of %i and paints it with the %s tier", (score, tier) => {
    render(<ScoreCell value={score} label="Perf. vaga" format={whole} />);
    const { cell, shown } = chip(`Perf. vaga: ${score}`);
    expect(shown).toBe(String(score));
    expect(cell).toHaveAttribute("data-tier", tier);
    expect(cell).toHaveClass(`bg-tier-${tier}`);
  });

  it("prints a value on its own scale and takes the tier from the percentile behind it", () => {
    render(<ScoreCell value={14.24} pct={92} label="Habilidade" format={(v) => v.toFixed(1).replace(".", ",")} />);
    const { cell, shown } = chip("Habilidade: 14,2, percentil 92");
    expect(shown).toBe("14,2");
    expect(cell).toHaveAttribute("data-tier", "elite");
  });

  it('shows "—" without a value and keeps the value unpainted without a percentile', () => {
    const { rerender } = render(<ScoreCell value={NaN} label="Estilo" format={whole} />);
    expect(chip("Estilo: sem dados").shown).toBe("—");
    rerender(<ScoreCell value={12.5} pct={NaN} label="Habilidade" format={whole} missing="group" />);
    const { cell, shown } = chip("Habilidade: 13, poucos na posição");
    expect(shown).toBe("13");
    expect(cell).not.toHaveAttribute("data-tier");
  });
});

describe("DeltaCell", () => {
  it.each([
    [23, "+23", "elite"],
    [12, "+12", "bom"],
    [0, "0", "mediano"],
    [-4, "-4", "mediano"],
    [-7, "-7", "abaixo"],
    [-25, "-25", "ruim"],
  ] as const)("prints %i signed and paints it on the diverging scale (%s, %s)", (delta, text, tier) => {
    render(<DeltaCell value={delta} label="vs seu" format={signedWhole} />);
    const { cell, shown } = chip(`vs seu: ${text}`);
    expect(shown).toBe(text);
    expect(cell).toHaveAttribute("data-tier", tier);
  });

  it("prints a difference on its own scale and takes the tier from the percentile difference behind it", () => {
    render(<DeltaCell value={1.3} basis={25} label="Hab. vs seu" format={signedTenth} />);
    const { cell, shown } = chip("Hab. vs seu: +1,3, +25 no percentil");
    expect(shown).toBe("+1,3");
    expect(cell).toHaveAttribute("data-tier", "elite");
  });

  it('shows "—" without a difference', () => {
    render(<DeltaCell value={NaN} label="vs seu" format={signedWhole} />);
    const { cell, shown } = chip("vs seu: sem dados");
    expect(shown).toBe("—");
    expect(cell).not.toHaveAttribute("data-tier");
  });

  it('says why a difference is hidden on its "—", in the tooltip and to screen readers', async () => {
    const user = userEvent.setup();
    render(<DeltaCell value={NaN} label="Stats vs ability" format={signedWhole} emptyReason="amostra pequena" />);
    const { cell, shown } = chip("Stats vs ability: amostra pequena");
    expect(shown).toBe("—");
    expect(cell).not.toHaveAttribute("data-tier");
    await user.hover(cell);
    expect(
      await screen.findByText("amostra pequena", { selector: ":not(.sr-only)" }, { timeout: 2000 }),
    ).toBeInTheDocument();
  });
});

describe("StatCell on the rating scale", () => {
  const rating = { label: "Nota média", unit: "rating" } as const;
  const tierOf = (value: number) => {
    render(<StatCell value={value} pct={50} mode="value" def={rating} scale="rating" />);
    return screen
      .getByText(/^Nota média/)
      .closest("[data-slot=stat-cell]")
      ?.getAttribute("data-tier");
  };

  it.each([
    [7, "bom"],
    [6.99, "mediano"],
    [7.4, "elite"],
    [6.49, "ruim"],
  ])("colours %s as %s whatever its percentile", (value, tier) => {
    expect(tierOf(value)).toBe(tier);
  });

  it("stays plain under the pool, with the reason", () => {
    render(<StatCell value={7.5} pct={NaN} mode="value" def={rating} scale="rating" missing="pool" />);
    const { cell } = chip("Nota média: 7,50, amostra pequena");
    expect(cell).not.toHaveAttribute("data-tier");
  });

  it("ignores a small group", () => {
    render(<StatCell value={7.5} pct={NaN} mode="value" def={rating} scale="rating" missing="group" />);
    const { cell } = chip("Nota média: 7,50");
    expect(cell).toHaveAttribute("data-tier", "elite");
  });

  it("clamps score chips to 0-100 in text, tooltip and percentile mode", () => {
    const score = { label: "Perf. função", unit: "score", lowerIsBetter: false } as const;
    const { rerender } = render(<StatCell value={110} pct={110} mode="value" def={score} />);
    expect(chip("Perf. função: 100, percentil 100").shown).toBe("100");
    rerender(<StatCell value={110} pct={110} mode="percentile" def={score} />);
    expect(chip("Perf. função: 100, percentil 100").shown).toBe("100");
    rerender(<StatCell value={-16} pct={-16} mode="percentile" def={score} />);
    expect(chip("Perf. função: 0, percentil 0").shown).toBe("0");
  });
});
