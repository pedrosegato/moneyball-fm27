import type { Amount } from "@/cart/lib/amount";
import { cartT } from "@/cart/lib/cartT";

export function slotsText(slots: number, avgPerSlot: number | null, amount: Amount): string {
  if (slots === 0) return cartT("slots.none");
  const left = cartT("slots.left", { count: slots });
  if (avgPerSlot === null) return cartT("slots.noBudget", { left });
  if (avgPerSlot === 0) return cartT("slots.spent", { left });
  return cartT("slots.perSlot", { left, amount: amount(avgPerSlot) });
}
