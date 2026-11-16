import type { VerdictTone } from "@/components/VerdictChip";
import type { FitVerdict } from "@/engine/tacticalFit";
import { formatDecimal } from "@/lib/format";
import { elencoT } from "./elencoT";

export const FIT_TONE: Readonly<Record<FitVerdict, VerdictTone>> = {
  upgrade: "high",
  replacement: "mid",
  downgrade: "low",
};

export const fitLabel = (verdict: FitVerdict): string => elencoT(`fitColumns.verdict.${verdict}`);

export const marginPoints = (lvl: number): string => formatDecimal(lvl, 1);

export const fitRule = (verdict: FitVerdict, lvl: number): string =>
  elencoT(`fitColumns.rule.${verdict}`, { points: marginPoints(lvl) });
