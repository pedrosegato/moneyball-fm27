import type { PlayerRecord } from "@/data/types";
import { marketValue } from "@/engine/club";
import { i18n } from "@/i18n";
import { CART_KIND, type CartKind } from "@/store/cart";

export function cartHint(player: PlayerRecord, kind: CartKind, inCart: boolean, amount: (pounds: number) => string) {
  if (inCart) return i18n.t("removeFromCart");
  const value = marketValue(player);
  const price = Number.isNaN(value) ? i18n.t("player:actions.priceUnset") : amount(value);
  return i18n.t(kind === CART_KIND.sell ? "player:actions.sellFor" : "player:actions.buyFor", { price });
}
