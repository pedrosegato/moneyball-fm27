import { deltaTier, qualityTier, ratingTier, TIER_CHIP_CLASS, TIERS } from "./quality";

describe("qualityTier", () => {
  it.each([
    [100, "elite"],
    [90, "elite"],
    [89, "bom"],
    [70, "bom"],
    [69, "mediano"],
    [40, "mediano"],
    [39, "abaixo"],
    [20, "abaixo"],
    [19, "ruim"],
    [0, "ruim"],
  ] as const)("puts percentile %i in %s", (pct, tier) => {
    expect(qualityTier(pct)).toBe(tier);
  });

  it("reads the percentile as the chip prints it, rounded, so colour and number never disagree", () => {
    expect(qualityTier(89.5)).toBe("elite");
    expect(qualityTier(89.4)).toBe("bom");
    expect(qualityTier(19.5)).toBe("abaixo");
  });

  it("has no tier without a percentile (small sample, no minutes)", () => {
    expect(qualityTier(Number.NaN)).toBeNull();
  });
});

describe("deltaTier", () => {
  it.each([
    [35, "elite"],
    [20, "elite"],
    [19, "bom"],
    [5, "bom"],
    [4, "mediano"],
    [0, "mediano"],
    [-4, "mediano"],
    [-5, "abaixo"],
    [-19, "abaixo"],
    [-20, "ruim"],
    [-60, "ruim"],
  ] as const)("puts a difference of %i in %s", (delta, tier) => {
    expect(deltaTier(delta)).toBe(tier);
  });

  it("rounds like the printed difference", () => {
    expect(deltaTier(4.6)).toBe("bom");
    expect(deltaTier(-4.4)).toBe("mediano");
    expect(deltaTier(19.5)).toBe("elite");
  });

  it("has no tier without a difference", () => {
    expect(deltaTier(Number.NaN)).toBeNull();
  });
});

describe("TIER_CHIP_CLASS", () => {
  it("fills every tier with its own token, the ink measured for it and the ring that edges it on paper", () => {
    for (const tier of TIERS) {
      expect(TIER_CHIP_CLASS[tier]).toBe(
        `bg-tier-${tier} text-tier-${tier}-ink ring-1 ring-inset ring-tier-${tier}-ring`,
      );
    }
  });
});

describe("ratingTier", () => {
  it.each([
    [7.4, "elite"],
    [7.39, "bom"],
    [7, "bom"],
    [6.99, "mediano"],
    [6.7, "mediano"],
    [6.69, "abaixo"],
    [6.5, "abaixo"],
    [6.49, "ruim"],
  ] as const)("puts rating %s in %s", (rating, tier) => {
    expect(ratingTier(rating)).toBe(tier);
  });

  it("reads the rating as the chip prints it, to two decimals", () => {
    expect(ratingTier(6.996)).toBe("bom");
    expect(ratingTier(6.994)).toBe("mediano");
  });

  it("has no tier without a rating", () => {
    expect(ratingTier(Number.NaN)).toBeNull();
  });
});
