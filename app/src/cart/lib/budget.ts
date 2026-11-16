import type { ClubFinances } from "@/data/types";
import type { ManualBudget } from "@/store/cart";

export interface Money {
  fee: number;
  wage: number;
}

export interface BudgetInput {
  transferBudget: number | null;
  wageBudgetWeekly: number | null;
  currentWageBill: number | null;
  purchases: readonly Money[];
  sales: readonly Money[];
  slotsLeft: number;
}

export interface Budget {
  transferLeft: number | null;
  transferPct: number | null;
  wageLeft: number | null;
  wagePct: number | null;
  avgPerSlot: number | null;
  overTransfer: boolean;
  overWage: boolean;
}

export const sumOf = (moves: readonly Money[], key: keyof Money) => moves.reduce((total, m) => total + m[key], 0);
const pctOf = (left: number | null, whole: number | null) =>
  left === null || !whole || whole <= 0 ? null : (left / whole) * 100;

export function computeBudget({
  transferBudget,
  wageBudgetWeekly,
  currentWageBill,
  purchases,
  sales,
  slotsLeft,
}: BudgetInput): Budget {
  const transferLeft = transferBudget === null ? null : transferBudget - sumOf(purchases, "fee") + sumOf(sales, "fee");
  const wageLeft =
    wageBudgetWeekly === null || currentWageBill === null
      ? null
      : wageBudgetWeekly - currentWageBill - sumOf(purchases, "wage") + sumOf(sales, "wage");
  return {
    transferLeft,
    transferPct: pctOf(transferLeft, transferBudget),
    wageLeft,
    wagePct: pctOf(wageLeft, wageBudgetWeekly),
    avgPerSlot: transferLeft === null || slotsLeft <= 0 ? null : Math.max(0, transferLeft) / slotsLeft,
    overTransfer: transferLeft !== null && transferLeft < 0,
    overWage: wageLeft !== null && wageLeft < 0,
  };
}

export function signingTarget(target: number | null, plannedBuys: number): number {
  return target ?? plannedBuys + 1;
}

export function slotsLeft(target: number, plannedBuys: number): number {
  return Math.max(0, target - plannedBuys);
}

export interface BudgetSource {
  transfer: number | null;
  wageWeekly: number | null;
  transferFromGame: boolean;
  wageFromGame: boolean;
  verified: boolean;
  transferHint: number | null;
  wageHint: number | null;
}

export function budgetSource(finances: ClubFinances | null, manual: ManualBudget | undefined): BudgetSource {
  const verified = finances?.verified ? finances : null;
  const transferFromGame = verified?.transfer_budget != null;
  const wageFromGame = verified?.wage_budget_weekly != null;
  return {
    transfer: verified?.transfer_budget ?? manual?.transfer ?? null,
    wageWeekly: verified?.wage_budget_weekly ?? manual?.wageWeekly ?? null,
    transferFromGame,
    wageFromGame,
    verified: finances?.verified ?? false,
    transferHint: verified ? null : (finances?.transfer_budget ?? null),
    wageHint: verified ? null : (finances?.wage_budget_weekly ?? null),
  };
}
