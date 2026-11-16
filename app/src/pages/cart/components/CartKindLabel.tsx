import { HandCoins, ShoppingCart } from "lucide-react";
import { cartT } from "@/cart/lib/cartT";
import { CART_KIND, type CartKind } from "@/store/cart";

const ICON = { [CART_KIND.buy]: ShoppingCart, [CART_KIND.sell]: HandCoins } as const;

export function CartKindLabel({ kind }: { kind: CartKind }) {
  const Icon = ICON[kind];
  return (
    <span className="inline-flex items-center gap-1.5 type-label text-fg-secondary">
      <Icon aria-hidden className="size-3.5 shrink-0 text-fg-muted" />
      {cartT(`kind.${kind}`)}
    </span>
  );
}
