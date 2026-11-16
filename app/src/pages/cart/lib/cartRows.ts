import type { ReconciledItem } from "@/cart/lib/reconcile";
import { CART_STATUS } from "@/store/cart";

export interface CartRows {
  rows: Uint32Array;
  lineAt: ReadonlyMap<number, ReconciledItem>;
  missing: readonly ReconciledItem[];
}

export function cartRows(lines: readonly ReconciledItem[], indexOf: (uid: number) => number | undefined): CartRows {
  const order: number[] = [];
  const lineAt = new Map<number, ReconciledItem>();
  const missing: ReconciledItem[] = [];
  for (const line of lines) {
    const i = indexOf(line.uid);
    if (i === undefined) {
      missing.push(line);
      continue;
    }
    const held = lineAt.get(i);
    if (!held) {
      lineAt.set(i, line);
      order.push(i);
    } else if (line.status === CART_STATUS.planned && held.status !== CART_STATUS.planned) lineAt.set(i, line);
  }
  return { rows: Uint32Array.from(order), lineAt, missing };
}
