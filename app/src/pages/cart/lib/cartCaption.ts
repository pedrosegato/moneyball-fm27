import { cartT } from "@/cart/lib/cartT";
import type { ReconciledItem } from "@/cart/lib/reconcile";
import type { PlayerRecord } from "@/data/types";
import { i18n } from "@/i18n";
import { CART_STATUS } from "@/store/cart";

const clubOf = (player: PlayerRecord) => player.club ?? i18n.t("noClub");

export function cartCaption(line: ReconciledItem | undefined, player: PlayerRecord): string {
  if (!line) return clubOf(player);
  if (line.status === CART_STATUS.sold) return cartT("caption.currentClub", { club: clubOf(player) });
  if (line.status === CART_STATUS.signed) return cartT("caption.inSquad");
  return [player.position, player.age != null && i18n.t("age", { age: player.age }), clubOf(player)]
    .filter(Boolean)
    .join(", ");
}
