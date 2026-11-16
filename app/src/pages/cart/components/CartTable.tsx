import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ReconciledItem } from "@/cart/lib/reconcile";
import { appStore } from "@/store/index";
import { SEARCH_KEY } from "@/store/ui";
import { useData } from "@/store/useData";
import type { TableColumnState } from "@/table/columns/types";
import { useTablePageState } from "@/table/hooks/useTablePageState";
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
  const page = useTablePageState();
  const cart = useCartLines(lines, players);
  const { composites, columns } = useCartColumns(players, analysis, cart.lineAt);
  const actions = useCartRemoveAction(cart.lineAt, cart.index);
  const columnState = useMemo<TableColumnState>(
    () => ({ group: null, ...page.columns, lead: CART_LEAD, fixed: CART_FIXED }),
    [page.columns],
  );

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
        rows={cart.rows}
        total={cart.everyRow.length}
        players={players}
        analysis={analysis}
        composites={composites}
        columns={columns}
        mode={page.mode}
        onModeChange={page.setMode}
        columnState={columnState}
        columnActions={page.columnActions}
        onOpenPlayer={page.selectPlayer}
        selectedUid={page.selectedUid}
        defaultSort={CART_SORT}
        selectionActions={actions}
        searchKey={SEARCH_KEY.cart}
        chips={
          cart.counts.buy > 0 &&
          cart.counts.sell > 0 && <CartKindFilter value={cart.kind} counts={cart.counts} onChange={cart.setKind} />
        }
        emptyDescription={t("table.empty")}
      />
    </>
  );
}
