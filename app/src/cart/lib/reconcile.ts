import type { PlayerRecord, Snapshot } from "@/data/types";
import { contractedTo } from "@/engine/club";
import { CART_KIND, CART_STATUS, type CartItem, type CartStatus, isSettled } from "@/store/cart";
import type { Money } from "./budget";

export type ReconciledItem = CartItem & { status: CartStatus };

export function reconcileCart(
  items: readonly CartItem[],
  snapshot: Snapshot,
  myClubUid: number | null,
): ReconciledItem[] {
  const byUid = new Map(snapshot.players.map((p) => [p.uid, p]));
  return items.map((item) => {
    const settledHere = myClubUid !== null && item.settledFor === myClubUid;
    if (settledHere && isSettled(item.status)) return { ...item, status: item.status };
    const player = byUid.get(item.uid);
    if (!player) return { ...item, status: CART_STATUS.unavailable };
    if (myClubUid === null) return { ...item, status: CART_STATUS.planned };
    const ours = contractedTo(player, myClubUid);
    if (item.kind === CART_KIND.buy) return { ...item, status: ours ? CART_STATUS.signed : CART_STATUS.planned };
    return { ...item, status: ours ? CART_STATUS.planned : CART_STATUS.sold };
  });
}

export function plannedMoves(lines: readonly ReconciledItem[]): { purchases: Money[]; sales: Money[] } {
  const purchases: Money[] = [];
  const sales: Money[] = [];
  for (const { status, kind, fee, wage } of lines) {
    if (status !== CART_STATUS.planned) continue;
    (kind === CART_KIND.buy ? purchases : sales).push({ fee, wage });
  }
  return { purchases, sales };
}

export function wageBill(players: readonly PlayerRecord[], clubUid: number | null): number {
  let total = 0;
  for (const p of players) if (contractedTo(p, clubUid)) total += p.wage ?? 0;
  return total;
}
