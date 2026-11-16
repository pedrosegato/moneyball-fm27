import { appStore } from "@/store/index";
import { CART_VIEW, type CartView } from "@/store/ui";
import { hrefOf } from "./Router";
import { PAGE } from "./routeIds";

export function cartLink(view: CartView = CART_VIEW.cart) {
  return {
    href: hrefOf({ page: PAGE.cart }),
    onClick: () => appStore.getState().setCartView(view),
  };
}
