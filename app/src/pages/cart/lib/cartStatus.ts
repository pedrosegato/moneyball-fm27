import { Check, CircleDashed, type LucideIcon, UserX } from "lucide-react";
import { cartT } from "@/cart/lib/cartT";
import { CART_STATUS, type CartStatus } from "@/store/cart";

type StatusKey = keyof typeof CART_STATUS;

interface StatusLook {
  key: StatusKey;
  icon: LucideIcon;
  className: string;
}

const SETTLED_LOOK = "border-line-strong bg-surface-active text-fg [&_svg]:text-success";

const LOOK: Readonly<Record<CartStatus, StatusLook>> = {
  [CART_STATUS.planned]: { key: "planned", icon: CircleDashed, className: "border-line text-fg-secondary" },
  [CART_STATUS.signed]: { key: "signed", icon: Check, className: SETTLED_LOOK },
  [CART_STATUS.sold]: { key: "sold", icon: Check, className: SETTLED_LOOK },
  [CART_STATUS.unavailable]: { key: "unavailable", icon: UserX, className: "border-dashed border-line text-fg-muted" },
};

export const statusLook = (status: CartStatus) => LOOK[status];
export const statusLabel = (status: CartStatus) => cartT(`status.${LOOK[status].key}.label`);
export const statusHint = (status: CartStatus) => cartT(`status.${LOOK[status].key}.hint`);
