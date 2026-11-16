import { X } from "lucide-react";
import { useMemo } from "react";
import { cartT } from "@/cart/lib/cartT";
import type { ReconciledItem } from "@/cart/lib/reconcile";
import { i18n } from "@/i18n";
import { appStore } from "@/store/index";
import { ActionButton } from "@/table/components/ActionButton";
import type { SelectionAction } from "@/table/lib/selectionActions";

export function useCartRemoveAction(lineAt: ReadonlyMap<number, ReconciledItem>, index: ReadonlyMap<number, number>) {
  return useMemo<readonly SelectionAction[]>(() => {
    const remove: SelectionAction = {
      id: "remove",
      render: ({ players: chosen, clear }) => (
        <ActionButton
          icon={X}
          label={i18n.t("removeFromCart")}
          hint={cartT("table.removeHint", { count: chosen.length })}
          onClick={() => {
            const entries = chosen.flatMap((p) => {
              const line = lineAt.get(index.get(p.uid) ?? -1);
              return line ? [{ uid: line.uid, kind: line.kind }] : [];
            });
            appStore.getState().removeManyFromCart(entries);
            clear();
          }}
        />
      ),
    };
    return [remove, "shortlist", "compare", "profile"];
  }, [lineAt, index]);
}
