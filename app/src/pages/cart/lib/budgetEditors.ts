import type { OnManual } from "@/cart/components/ManualBudgetField";
import type { ManualBudget } from "@/store/cart";
import { appStore } from "@/store/index";

const NO_BUDGET: ManualBudget = { transfer: null, wageWeekly: null };

export interface BudgetEditors {
  onManual: OnManual;
  onTarget: ((target: number) => void) | null;
}

export function budgetEditors(club: number | null): BudgetEditors {
  if (club === null) return { onManual: null, onTarget: null };
  return {
    onManual: (patch) => {
      const { cart, setManualBudget } = appStore.getState();
      setManualBudget(club, { ...(cart.budgets[String(club)] ?? NO_BUDGET), ...patch });
    },
    onTarget: (target) => appStore.getState().setSigningTarget(club, target),
  };
}
