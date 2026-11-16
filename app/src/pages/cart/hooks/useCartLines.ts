import { useMemo, useState } from "react";
import type { ReconciledItem } from "@/cart/lib/reconcile";
import type { PlayerRecord } from "@/data/types";
import { ALL, type All } from "@/lib/constants";
import { CART_KIND, type CartKind } from "@/store/cart";
import { useStableRows } from "@/table/lib/rows";
import { cartRows } from "../lib/cartRows";

export type CartKindFilter = CartKind | All;

export function useCartLines(lines: readonly ReconciledItem[], players: readonly PlayerRecord[] | undefined) {
  const [kind, setKind] = useState<CartKindFilter>(ALL);
  const index = useMemo(() => new Map(players?.map((p, i) => [p.uid, i])), [players]);
  const { rows: everyRow, lineAt, missing } = useMemo(() => cartRows(lines, (uid) => index.get(uid)), [lines, index]);
  const counts = useMemo(() => {
    const out: Record<CartKind, number> = { [CART_KIND.buy]: 0, [CART_KIND.sell]: 0 };
    for (const line of lineAt.values()) out[line.kind]++;
    return out;
  }, [lineAt]);
  const shownKind: CartKindFilter = kind !== ALL && counts[kind] > 0 ? kind : ALL;
  const rows = useStableRows(
    useMemo(
      () => (shownKind === ALL ? everyRow : everyRow.filter((i) => lineAt.get(i)?.kind === shownKind)),
      [everyRow, lineAt, shownKind],
    ),
  );
  return { index, everyRow, lineAt, missing, counts, kind: shownKind, setKind, rows };
}
