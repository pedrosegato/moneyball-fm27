import { qualityTier, TIER_FILL_CLASS } from "@/lib/quality";
import { cn } from "@/lib/utils";
import { medianBar } from "../lib/medianBar";

export function HeadToHeadBar({ pct }: { pct: number }) {
  const tier = qualityTier(pct);
  const bar = tier && medianBar(pct);
  if (!tier || !bar) return null;
  return <i className={cn("absolute top-0.5 h-2", TIER_FILL_CLASS[tier], bar.side)} style={{ width: bar.width }} />;
}
