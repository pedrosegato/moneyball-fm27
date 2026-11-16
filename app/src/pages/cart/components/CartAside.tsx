import { useTranslation } from "react-i18next";
import { BudgetBar } from "@/cart/components/BudgetBar";
import { CartPitch } from "@/cart/components/CartPitch";
import type { CartPlan } from "@/cart/hooks/useCartBudget";
import type { PlayerRecord } from "@/data/types";
import type { BudgetEditors } from "../lib/budgetEditors";
import { CartSlots } from "./CartSlots";

interface CartAsideProps extends BudgetEditors {
  plan: CartPlan;
  players: readonly PlayerRecord[];
}

export function CartAside({ plan, players, onManual, onTarget }: CartAsideProps) {
  const { t } = useTranslation("cart");
  const { club, source, budget, moves, currentWageBill, target, slots, lines } = plan;
  const typed = !source.transferFromGame || !source.wageFromGame;
  return (
    <aside
      aria-label={t("aside")}
      className="grid max-h-[45%] shrink-0 content-start gap-6 overflow-y-auto border-t border-line-subtle px-4 py-4 @xl:grid-cols-2 @5xl:flex @5xl:max-h-none @5xl:w-[22rem] @5xl:flex-col @5xl:border-t-0 @5xl:border-l"
    >
      <div className="flex min-w-0 flex-col gap-3">
        {club === null && (
          <p className="rounded-lg border border-dashed border-line px-2.5 py-2 type-caption text-fg-muted">
            {t("noClub")}
          </p>
        )}
        <BudgetBar
          source={source}
          budget={budget}
          moves={moves}
          currentWageBill={currentWageBill}
          onManual={onManual}
        />
        {typed && onManual && <p className="type-caption text-fg-muted">{t("typedNote")}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <CartSlots target={target} slots={slots} avgPerSlot={budget.avgPerSlot} onTarget={onTarget} />
        <CartPitch lines={lines} players={players} />
      </div>
    </aside>
  );
}
