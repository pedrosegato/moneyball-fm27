export const TIERS = ["elite", "bom", "mediano", "abaixo", "ruim"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_NAME: Record<Tier, string> = {
  elite: "Elite",
  bom: "Bom",
  mediano: "Mediano",
  abaixo: "Abaixo",
  ruim: "Ruim",
};

interface TierCut {
  tier: Tier;

  from: number;

  range: string;
}

export const PERCENTILE_TIERS: readonly TierCut[] = [
  { tier: "elite", from: 90, range: "90–100" },
  { tier: "bom", from: 70, range: "70–89" },
  { tier: "mediano", from: 40, range: "40–69" },
  { tier: "abaixo", from: 20, range: "20–39" },
  { tier: "ruim", from: -Infinity, range: "0–19" },
];

export const DELTA_TIERS: readonly TierCut[] = [
  { tier: "elite", from: 20, range: "+20 ou mais" },
  { tier: "bom", from: 5, range: "+5 a +19" },
  { tier: "mediano", from: -4, range: "−4 a +4" },
  { tier: "abaixo", from: -19, range: "−5 a −19" },
  { tier: "ruim", from: -Infinity, range: "−20 ou menos" },
];

export const RATING_TIERS: readonly TierCut[] = [
  { tier: "elite", from: 7.4, range: "7,40 ou mais" },
  { tier: "bom", from: 7, range: "7,00 a 7,39" },
  { tier: "mediano", from: 6.7, range: "6,70 a 6,99" },
  { tier: "abaixo", from: 6.5, range: "6,50 a 6,69" },
  { tier: "ruim", from: -Infinity, range: "abaixo de 6,50" },
];

export type TierScale = "percentile" | "delta" | "rating";

export const TIER_CUTS: Record<TierScale, readonly TierCut[]> = {
  percentile: PERCENTILE_TIERS,
  delta: DELTA_TIERS,
  rating: RATING_TIERS,
};

const SCALE_DECIMALS: Record<TierScale, number> = { percentile: 0, delta: 0, rating: 2 };

function tierOf(scale: TierScale, value: number): Tier | null {
  if (Number.isNaN(value)) return null;
  const cuts = TIER_CUTS[scale];
  const factor = 10 ** SCALE_DECIMALS[scale];
  const shown = Math.round(value * factor) / factor;
  return (cuts.find(({ from }) => shown >= from) ?? cuts[cuts.length - 1]).tier;
}

export const qualityTier = (pct: number): Tier | null => tierOf("percentile", pct);

export const deltaTier = (delta: number): Tier | null => tierOf("delta", delta);

export const ratingTier = (rating: number): Tier | null => tierOf("rating", rating);

export const CHIP_SHAPE =
  "relative inline-flex h-[1.375rem] min-w-[2.875rem] items-center justify-end rounded-md px-[0.4375rem] type-label font-[560] tabular-nums";

export const TIER_FILL_CLASS: Record<Tier, string> = {
  elite: "bg-tier-elite",
  bom: "bg-tier-bom",
  mediano: "bg-tier-mediano",
  abaixo: "bg-tier-abaixo",
  ruim: "bg-tier-ruim",
};

export const TIER_MARK_CLASS: Record<Tier, string> = {
  elite: "fill-tier-elite",
  bom: "fill-tier-bom",
  mediano: "fill-tier-mediano",
  abaixo: "fill-tier-abaixo",
  ruim: "fill-tier-ruim",
};

const TIER_INK_CLASS: Record<Tier, string> = {
  elite: "text-tier-elite-ink",
  bom: "text-tier-bom-ink",
  mediano: "text-tier-mediano-ink",
  abaixo: "text-tier-abaixo-ink",
  ruim: "text-tier-ruim-ink",
};

const TIER_RING_CLASS: Record<Tier, string> = {
  elite: "ring-tier-elite-ring",
  bom: "ring-tier-bom-ring",
  mediano: "ring-tier-mediano-ring",
  abaixo: "ring-tier-abaixo-ring",
  ruim: "ring-tier-ruim-ring",
};

export const TIER_CHIP_CLASS = Object.fromEntries(
  TIERS.map((tier) => [
    tier,
    `${TIER_FILL_CLASS[tier]} ${TIER_INK_CLASS[tier]} ring-1 ring-inset ${TIER_RING_CLASS[tier]}`,
  ]),
) as Record<Tier, string>;

export const NO_TIER_CHIP_CLASS = "border border-dashed border-line-strong text-fg-faint font-medium";
