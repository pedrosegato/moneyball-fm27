import { createAppStore } from "@/store/index";
import { hydrateStore, memoryStorage, persistStore } from "@/store/persist";
import { MY, OTHER } from "../testing/cartItems";
import { budgetSource, computeBudget, signingTarget, slotsLeft } from "./budget";

describe("computeBudget", () => {
  it("budget math with purchases and sales", () => {
    const budget = computeBudget({
      transferBudget: 24_000_000,
      wageBudgetWeekly: 500_000,
      currentWageBill: 420_000,
      purchases: [
        { fee: 8_300_000, wage: 40_000 },
        { fee: 2_500_000, wage: 18_000 },
      ],
      sales: [{ fee: 2_900_000, wage: 25_000 }],
      slotsLeft: 2,
    });
    expect(budget.transferLeft).toBe(16_100_000);
    expect(budget.transferPct).toBeCloseTo((16.1 / 24) * 100);
    expect(budget.wageLeft).toBe(47_000);
    expect(budget.wagePct).toBeCloseTo(9.4);
    expect(budget.avgPerSlot).toBe(8_050_000);
    expect(budget.overTransfer).toBe(false);
    expect(budget.overWage).toBe(false);
  });

  it("over budget flags", () => {
    const budget = computeBudget({
      transferBudget: 10_000_000,
      wageBudgetWeekly: 100_000,
      currentWageBill: 95_000,
      purchases: [{ fee: 12_000_000, wage: 10_000 }],
      sales: [{ fee: 1_000_000, wage: 0 }],
      slotsLeft: 3,
    });
    expect(budget.transferLeft).toBe(-1_000_000);
    expect(budget.wageLeft).toBe(-5_000);
    expect(budget.overTransfer).toBe(true);
    expect(budget.overWage).toBe(true);
    expect(budget.avgPerSlot).toBe(0);
  });

  it("leaves a side empty when its budget is unknown, and never divides by zero", () => {
    const none = computeBudget({
      transferBudget: null,
      wageBudgetWeekly: null,
      currentWageBill: 300_000,
      purchases: [{ fee: 5_000_000, wage: 20_000 }],
      sales: [],
      slotsLeft: 2,
    });
    expect(none).toEqual({
      transferLeft: null,
      transferPct: null,
      wageLeft: null,
      wagePct: null,
      avgPerSlot: null,
      overTransfer: false,
      overWage: false,
    });

    const unread = computeBudget({
      transferBudget: 10_000_000,
      wageBudgetWeekly: 400_000,
      currentWageBill: null,
      purchases: [],
      sales: [],
      slotsLeft: 0,
    });
    expect(unread).toMatchObject({ transferLeft: 10_000_000, wageLeft: null, wagePct: null, overWage: false });

    const zero = computeBudget({
      transferBudget: 0,
      wageBudgetWeekly: 0,
      currentWageBill: 0,
      purchases: [],
      sales: [{ fee: 3_000_000, wage: 0 }],
      slotsLeft: 0,
    });
    expect(zero.transferLeft).toBe(3_000_000);
    expect(zero.transferPct).toBeNull();
    expect(zero.wagePct).toBeNull();
    expect(zero.avgPerSlot).toBeNull();
  });
});

describe("slots", () => {
  it("is the target less the buys still planned, never below zero", () => {
    expect(slotsLeft(5, 2)).toBe(3);
    expect(slotsLeft(1, 3)).toBe(0);
  });

  it("opens one slot past the planned buys until the user sets a target", () => {
    expect(signingTarget(null, 2)).toBe(3);
    expect(signingTarget(null, 0)).toBe(1);
    expect(signingTarget(5, 2)).toBe(5);
  });

  it("2 planned buys leave 1 slot with a finite price per slot", () => {
    const slots = slotsLeft(signingTarget(null, 2), 2);
    expect(slots).toBe(1);
    const { avgPerSlot } = computeBudget({
      transferBudget: 24_000_000,
      wageBudgetWeekly: null,
      currentWageBill: 0,
      purchases: [
        { fee: 8_000_000, wage: 0 },
        { fee: 2_000_000, wage: 0 },
      ],
      sales: [],
      slotsLeft: slots,
    });
    expect(avgPerSlot).toBe(14_000_000);
    expect(Number.isFinite(avgPerSlot)).toBe(true);
  });
});

describe("budgetSource", () => {
  it("takes each side from the game once its reading is verified, else from what the user typed", () => {
    const manual = { transfer: 24_000_000, wageWeekly: 400_000 };
    expect(
      budgetSource({ club_uid: 1, transfer_budget: 10_000_000, wage_budget_weekly: null, verified: true }, manual),
    ).toEqual({
      transfer: 10_000_000,
      wageWeekly: 400_000,
      transferFromGame: true,
      wageFromGame: false,
      verified: true,
      transferHint: null,
      wageHint: null,
    });
    expect(budgetSource(null, manual)).toEqual({
      transfer: 24_000_000,
      wageWeekly: 400_000,
      transferFromGame: false,
      wageFromGame: false,
      verified: false,
      transferHint: null,
      wageHint: null,
    });
    expect(budgetSource(null, undefined)).toMatchObject({ transfer: null, wageWeekly: null });
  });

  it("keeps the typed budget over an unverified reading, offering the game's numbers as hints", () => {
    const manual = { transfer: 24_000_000, wageWeekly: null };
    const unverified = { club_uid: 1, transfer_budget: 1_120_000, wage_budget_weekly: 157_249, verified: false };
    expect(budgetSource(unverified, manual)).toEqual({
      transfer: 24_000_000,
      wageWeekly: null,
      transferFromGame: false,
      wageFromGame: false,
      verified: false,
      transferHint: 1_120_000,
      wageHint: 157_249,
    });
    expect(budgetSource({ ...unverified, wage_budget_weekly: null }, undefined)).toMatchObject({
      transfer: null,
      transferHint: 1_120_000,
      wageHint: null,
    });
  });

  it("manual budget persists per save (club uid)", async () => {
    const storage = memoryStorage();
    const store = createAppStore();
    const persistence = persistStore(store, storage);
    store.getState().setManualBudget(MY, { transfer: 24_000_000, wageWeekly: 450_000 });
    store.getState().setManualBudget(OTHER, { transfer: 3_000_000, wageWeekly: null });
    await persistence.flush();
    persistence.stop();

    const reopened = createAppStore();
    await hydrateStore(reopened, storage);
    const { budgets } = reopened.getState().cart;
    expect(budgetSource(null, budgets[String(MY)])).toMatchObject({ transfer: 24_000_000, wageWeekly: 450_000 });
    expect(budgetSource(null, budgets[String(OTHER)])).toMatchObject({ transfer: 3_000_000, wageWeekly: null });
    expect(budgets["777"]).toBeUndefined();
  });
});
