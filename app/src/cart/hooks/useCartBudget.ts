import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { myClubUid } from "@/data/myClub";
import { CART_STATUS } from "@/store/cart";
import { useAppStore } from "@/store/index";
import { budgetSource, computeBudget, signingTarget, slotsLeft } from "../lib/budget";
import { plannedMoves, type ReconciledItem, reconcileCart, wageBill } from "../lib/reconcile";

export function useCartBudget() {
  const { items, snapshot, finances, budgets, targets } = useAppStore(
    useShallow((s) => ({
      items: s.cart.items,
      snapshot: s.data.snapshot,
      finances: s.data.finances,
      budgets: s.cart.budgets,
      targets: s.cart.targets,
    })),
  );
  const club = snapshot ? myClubUid(snapshot) : null;
  const lines = useMemo<ReconciledItem[]>(
    () =>
      snapshot
        ? reconcileCart(items, snapshot, club)
        : items.map((i) => ({ ...i, status: i.status ?? CART_STATUS.planned })),
    [items, snapshot, club],
  );
  const currentWageBill = useMemo(() => (snapshot ? wageBill(snapshot.players, club) : null), [snapshot, club]);
  const moves = useMemo(() => plannedMoves(lines), [lines]);

  const key = club === null ? null : String(club);
  const source = budgetSource(finances?.club_uid === club ? finances : null, key === null ? undefined : budgets[key]);
  const plannedBuys = moves.purchases.length;
  const target = signingTarget(key === null ? null : (targets[key] ?? null), plannedBuys);
  const slots = slotsLeft(target, plannedBuys);
  const budget = computeBudget({
    transferBudget: source.transfer,
    wageBudgetWeekly: source.wageWeekly,
    currentWageBill,
    ...moves,
    slotsLeft: slots,
  });
  return { club, snapshot, lines, moves, source, currentWageBill, budget, target, slots };
}
export type CartPlan = ReturnType<typeof useCartBudget>;
