import { cartT } from "@/cart/lib/cartT";
import type { ReconciledItem } from "@/cart/lib/reconcile";

const LISTED = 3;

export function cartMissingText(missing: readonly ReconciledItem[]): string {
  const names = missing.map((l) => l.name);
  const listed =
    names.length > LISTED
      ? cartT("table.andMore", { names: names.slice(0, LISTED).join(", "), rest: names.length - LISTED })
      : names.join(", ");
  return cartT("table.missing", { count: missing.length, name: names[0], listed });
}
