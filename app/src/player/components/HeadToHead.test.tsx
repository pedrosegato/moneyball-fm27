import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { STATS } from "@/engine/stats/catalog";
import type { StatLine } from "../lib/profile";
import { HeadToHead } from "./HeadToHead";

const npxg = STATS.find((s) => s.key === "npxG/90")!;
const line = (pct: number): StatLine => ({ def: npxg, value: 0.4, pct, median: 0.2, top: 0.6 });

describe("HeadToHead", () => {
  it.each([
    [96, "elite"],
    [80, "bom"],
    [60, "mediano"],
    [45, "mediano"],
    [30, "abaixo"],
    [8, "ruim"],
  ] as const)("paints the bar of a percentile %i with the %s tier, on its side of the median", (pct, tier) => {
    render(
      <TooltipProvider>
        <HeadToHead lines={[line(pct)]} />
      </TooltipProvider>,
    );
    const bar = screen.getByRole("listitem").querySelector("i");
    expect(bar).toHaveClass(`bg-tier-${tier}`);
    expect(bar).toHaveClass(pct > 50 ? "left-[calc(50%+1px)]" : "right-[calc(50%+1px)]");
  });
});
