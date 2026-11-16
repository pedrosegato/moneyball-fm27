import { useTranslation } from "react-i18next";
import type { ReconciledItem } from "@/cart/lib/reconcile";
import { FILTER_TABLE } from "@/store/filters";
import { appStore } from "@/store/index";
import { useData } from "@/store/useData";
import { PlayerTable } from "@/table/PlayerTable";
import { useCartColumns } from "../hooks/useCartColumns";
import { useCartLines } from "../hooks/useCartLines";
import { useCartRemoveAction } from "../hooks/useCartRemoveAction";
import { CART_FIXED, CART_LEAD, CART_SORT } from "../lib/cartColumns";
import { cartMissingText } from "../lib/cartMissingText";
import { CartKindFilter } from "./CartKindFilter";
import { MissingNote } from "./MissingNote";

export function CartTable({ lines }: { lines: readonly ReconciledItem[] }) {
  const { t } = useTranslation("cart");
  const { snapshot, analysis } = useData();
  const players = snapshot?.players;
  const cart = useCartLines(lines, players);
  const { composites, columns } = useCartColumns(players, analysis, cart.lineAt);
  const actions = useCartRemoveAction(cart.lineAt, cart.index);

  if (!snapshot || !analysis || !columns || !players) return null;

  return (
    <>
      {cart.missing.length > 0 && (
        <MissingNote
          text={cartMissingText(cart.missing)}
          action={t("removeFromCart", { ns: "common" })}
          onAction={() => appStore.getState().removeManyFromCart(cart.missing)}
        />
      )}
      <PlayerTable
        table={FILTER_TABLE.cart}
        rows={cart.rows}
        total={cart.everyRow.length}
        players={players}
        analysis={analysis}
        composites={composites}
        columns={columns}
        lead={CART_LEAD}
        fixed={CART_FIXED}
        defaultSort={CART_SORT}
        selectionActions={actions}
        chips={
          cart.counts.buy > 0 &&
          cart.counts.sell > 0 && <CartKindFilter value={cart.kind} counts={cart.counts} onChange={cart.setKind} />
        }
        emptyDescription={t("table.empty")}
      />
    </>
  );
}
