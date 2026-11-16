import { useMemo } from "react";
import { useCartBudget } from "@/cart/hooks/useCartBudget";
import { budgetEditors } from "../lib/budgetEditors";
import { CartAside } from "./CartAside";
import { CartEmpty } from "./CartEmpty";
import { CartTable } from "./CartTable";

export function CartContents() {
  const plan = useCartBudget();
  const { snapshot, lines } = plan;
  const players = useMemo(() => {
    const wanted = new Set(lines.map((l) => l.uid));
    return snapshot ? snapshot.players.filter((p) => wanted.has(p.uid)) : [];
  }, [snapshot, lines]);
  const editors = budgetEditors(plan.club);

  return (
    <div className="@container flex min-h-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col @5xl:flex-row">
        <div className="flex min-h-[22rem] min-w-0 flex-1 flex-col">
          {lines.length === 0 ? <CartEmpty /> : <CartTable lines={lines} />}
        </div>
        <CartAside plan={plan} players={players} onManual={editors.onManual} onTarget={editors.onTarget} />
      </div>
    </div>
  );
}
