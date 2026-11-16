import { i18n } from "@/i18n";
import type { Amount } from "./amount";
import { cartT } from "./cartT";

export interface MeterReading {
  tone: "none" | "unknown" | "over" | "left";
  text: string;
  spoken: string;
}

interface MeterSide {
  budget: number | null;
  left: number | null;
  pct: number | null;
  over: boolean;
  whole: string;
  unknown: string;
  amount: Amount;
}

const said = (tone: MeterReading["tone"], text: string): MeterReading => ({ tone, text, spoken: text });

export function meterReading({ budget, left, pct, over, whole, unknown, amount }: MeterSide): MeterReading {
  if (budget !== null && left === null) return { tone: "unknown", text: cartT("budget.unknownLeft"), spoken: unknown };
  if (left !== null && over) return said("over", i18n.t("budget.over", { amount: amount(-left) }));
  if (left === null) return said("none", i18n.t("budget.unset"));
  if (pct === null) return said("left", cartT("budget.left", { amount: amount(left) }));
  const rounded = Math.round(pct);
  return {
    tone: "left",
    text: i18n.t("budget.leftPct", { amount: amount(left), pct: rounded }),
    spoken: cartT("budget.leftSpoken", { amount: amount(left), pct: rounded, whole }),
  };
}
