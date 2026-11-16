import { useCallback } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { Tactic } from "@/data/types";
import { formatMoney, formatWage, type Money, moneyOf, POUNDS } from "@/lib/money";
import { type CartSlice, createCartSlice } from "./cart";
import { type ColumnsSlice, createColumnsSlice } from "./columns";
import { type CompositesSlice, createCompositesSlice } from "./compositesSlice";
import { createDataSlice, type DataSlice, type DataState } from "./data";
import { createFiltersSlice, type FiltersSlice } from "./filters";
import { createFitSlice, type FitSlice } from "./fit";
import { createSettingsSlice, type SettingsSlice } from "./settings";
import { createShortlistSlice, type ShortlistSlice } from "./shortlist";
import { createUiSlice, type UiSlice } from "./ui";

export type AppState = DataSlice &
  UiSlice &
  FiltersSlice &
  ColumnsSlice &
  CartSlice &
  ShortlistSlice &
  CompositesSlice &
  SettingsSlice &
  FitSlice;

export type AppStore = StoreApi<AppState>;

export function createAppStore(): AppStore {
  return createStore<AppState>()((...a) => ({
    ...createDataSlice(...a),
    ...createUiSlice(...a),
    ...createFiltersSlice(...a),
    ...createColumnsSlice(...a),
    ...createCartSlice(...a),
    ...createShortlistSlice(...a),
    ...createCompositesSlice(...a),
    ...createSettingsSlice(...a),
    ...createFitSlice(...a),
  }));
}

export const appStore = createAppStore();

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useStore(appStore, selector);
}

export const gameMoneyOf = (data: Pick<DataState, "status" | "snapshot">): Money | null =>
  moneyOf(data.status?.money ?? data.snapshot?.money);

export function useGameMoney(): Money | null {
  return useAppStore(useShallow((s) => gameMoneyOf(s.data)));
}

export const gameTacticOf = (data: Pick<DataState, "snapshot">): Tactic | null => data.snapshot?.tactic ?? null;

export function useGameTactic(): Tactic | null {
  return useAppStore((s) => gameTacticOf(s.data));
}

export function useMoney(): Money {
  return useAppStore(useShallow((s) => gameMoneyOf(s.data) ?? POUNDS));
}

export function useFormatMoney(): (pounds: number) => string {
  const money = useMoney();
  return useCallback((pounds: number) => formatMoney(pounds, money), [money]);
}

export function useFormatWage(): (weeklyPounds: number) => string {
  const money = useMoney();
  return useCallback((weeklyPounds: number) => formatWage(weeklyPounds, money), [money]);
}
