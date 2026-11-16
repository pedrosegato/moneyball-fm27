import { HandCoins, type LucideIcon, ShoppingCart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { marketValue } from "@/engine/club";
import { type CartKind, cartItemOf } from "@/store/cart";
import { appStore, useAppStore, useFormatMoney } from "@/store/index";
import { type CartMove, cartBlock } from "../lib/selectionPlan";
import { ActionButton } from "./ActionButton";

const MOVE_ICON: Readonly<Record<CartKind, LucideIcon>> = { buy: ShoppingCart, sell: HandCoins };

interface CartMoveButtonProps {
  move: CartMove;
  moves: readonly CartMove[];
  primary: boolean;
}

export function CartMoveButton({ move, moves, primary }: CartMoveButtonProps) {
  const { t } = useTranslation("table");
  const amount = useFormatMoney();
  const cartSize = useAppStore((s) => s.cart.items.length);
  const { kind, players, missing } = move;
  const label = t(`action.${kind}.label`);
  const all = missing.length === 0;
  const total = missing.reduce((sum, p) => sum + (Number.isNaN(marketValue(p)) ? 0 : marketValue(p)), 0);
  const hint = all
    ? t("action.inCart", { count: players.length })
    : t("action.move", {
        verb: t(`action.${kind}.verb`),
        players: t("players", { ns: "common", count: missing.length }),
        total: amount(total),
      });
  const onClick = () => {
    const { addManyToCart, removeManyFromCart } = appStore.getState();
    if (all) removeManyFromCart(players.map((p) => ({ uid: p.uid, kind })));
    else addManyToCart(missing.map((p) => cartItemOf(p, kind)));
  };
  return (
    <ActionButton
      icon={MOVE_ICON[kind]}
      label={moves.length > 1 ? t("action.counted", { label, count: players.length }) : label}
      hint={hint}
      blocked={cartBlock(move, moves, cartSize)}
      pressed={all}
      primary={primary}
      onClick={onClick}
    />
  );
}
