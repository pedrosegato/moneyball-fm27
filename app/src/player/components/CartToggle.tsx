import { Check, ShoppingCart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import type { PlayerRecord } from "@/data/types";
import { cn } from "@/lib/utils";
import { CART_KIND, cartItemOf, cartKindOf } from "@/store/cart";
import { useAppStore, useFormatMoney } from "@/store/index";
import { cartHint } from "../lib/cartHint";
import { PRESSED } from "../lib/pressed";

interface CartToggleProps {
  player: PlayerRecord;
  myClubUid: number | null;
}

export function CartToggle({ player, myClubUid }: CartToggleProps) {
  const { t } = useTranslation("player");
  const amount = useFormatMoney();
  const kind = cartKindOf(player, myClubUid);
  const { inCart, addToCart, removeFromCart } = useAppStore(
    useShallow((s) => ({
      inCart: s.cart.items.some((i) => i.uid === player.uid && i.kind === kind),
      addToCart: s.addToCart,
      removeFromCart: s.removeFromCart,
    })),
  );
  const toggle = () => (inCart ? removeFromCart(player.uid, kind) : addToCart(cartItemOf(player, kind)));
  return (
    <Button
      variant={inCart ? "outline" : "default"}
      aria-pressed={inCart}
      title={cartHint(player, kind, inCart, amount)}
      className={cn("flex-1", PRESSED)}
      onClick={toggle}
    >
      {inCart ? <Check data-icon="inline-start" /> : <ShoppingCart data-icon="inline-start" />}
      {kind === CART_KIND.sell ? t("actions.sell") : t("page.carrinho", { ns: "common" })}
    </Button>
  );
}
