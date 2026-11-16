import { render, screen } from "@testing-library/react";
import { VerdictChip } from "./VerdictChip";

describe("VerdictChip", () => {
  it.each([
    ["high", "bom"],
    ["mid", "mediano"],
    ["low", "abaixo"],
  ] as const)("paints a %s verdict with the %s tier, the word always written", (tone, tier) => {
    render(<VerdictChip label="Manter" tone={tone} />);
    expect(screen.getByText("Manter")).toHaveClass(`bg-tier-${tier}`, `text-tier-${tier}-ink`);
  });
});
