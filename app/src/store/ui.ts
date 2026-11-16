import type { StateCreator } from "zustand";
import { CURRENT_SEASON, isPeriod, type Period } from "@/engine/period";
import { isRoleId, type RoleId } from "@/engine/roles/catalog";
import type { GroupKey } from "./columns";
import type { AppState } from "./index";
import { fieldsOf, oneOf } from "./sanitize";

export const VALUE_MODE = { value: "value", percentile: "percentile" } as const;
export type ValueMode = (typeof VALUE_MODE)[keyof typeof VALUE_MODE];
export const VALUE_MODES: readonly ValueMode[] = Object.values(VALUE_MODE);

export const CART_VIEW = { cart: "carrinho", shortlist: "shortlist" } as const;
export type CartView = (typeof CART_VIEW)[keyof typeof CART_VIEW];
export const CART_VIEWS: readonly CartView[] = Object.values(CART_VIEW);

export const PITCH_VIEW = { overview: "panoramico", ip: "comPosse", oop: "semPosse", both: "ambos" } as const;
export type PitchView = (typeof PITCH_VIEW)[keyof typeof PITCH_VIEW];
export const PITCH_VIEWS: readonly PitchView[] = Object.values(PITCH_VIEW);

export const ELENCO_TAB = { squad: "elenco", signings: "contratacoes" } as const;
export type ElencoTab = (typeof ELENCO_TAB)[keyof typeof ELENCO_TAB];

export const SEARCH_KEY = {
  scout: "scout",
  squad: "elenco",
  signings: "contratacoes",
  rank: "rank",
  shortlist: "shortlist",
  cart: "carrinho",
} as const;
export type SearchKey = (typeof SEARCH_KEY)[keyof typeof SEARCH_KEY];

export interface ElencoView {
  slot: number;
  tab: ElencoTab;
}

export interface GraphAxes {
  x: string;
  y: string;
}

export type GraphAxesKey = GroupKey;

export interface GraphsState {
  axes: Partial<Record<GraphAxesKey, GraphAxes>>;
  labels: number;
}

export interface UiState {
  mode: ValueMode;
  selectedUid: number | null;
  notice: string | null;
  moneyball: boolean;
  signingsMoneyball: boolean;
  searches: Partial<Record<SearchKey, string>>;
  compare: number[];
  graphs: GraphsState;
  cartView: CartView;
  elenco: ElencoView;
  sidebarCollapsed: boolean;
  role: RoleId | null;
  period: Period;
  pitchView: PitchView;
}

export interface UiSlice {
  ui: UiState;
  setMode(mode: ValueMode): void;
  selectPlayer(uid: number | null): void;
  showNotice(text: string): void;
  clearNotice(): void;
  setMoneyball(on: boolean): void;
  setSigningsMoneyball(on: boolean): void;
  setSearch(key: SearchKey, text: string): void;
  toggleCompare(uid: number): void;
  setCompare(uids: readonly number[]): void;
  setGraphAxes(key: GraphAxesKey, axes: GraphAxes): void;
  setGraphLabels(count: number): void;
  setCartView(view: CartView): void;
  setElencoView(view: ElencoView): void;
  toggleSidebar(): void;
  setRole(role: RoleId | null): void;
  setPeriod(period: Period): void;
  setPitchView(view: PitchView): void;
}

export const MAX_COMPARE = 3;

export const DEFAULT_GRAPH_LABELS = 10;

const defaultUi = (): UiState => ({
  mode: VALUE_MODE.value,
  selectedUid: null,
  notice: null,
  moneyball: false,
  signingsMoneyball: false,
  searches: {},
  compare: [],
  graphs: { axes: {}, labels: DEFAULT_GRAPH_LABELS },
  cartView: CART_VIEW.cart,
  elenco: { slot: 0, tab: ELENCO_TAB.squad },
  sidebarCollapsed: false,
  role: null,
  period: CURRENT_SEASON,
  pitchView: PITCH_VIEW.ip,
});

export const createUiSlice: StateCreator<AppState, [], [], UiSlice> = (set) => ({
  ui: defaultUi(),
  setMode: (mode) => set((s) => ({ ui: { ...s.ui, mode } })),
  selectPlayer: (selectedUid) => set((s) => ({ ui: { ...s.ui, selectedUid } })),
  showNotice: (notice) => set((s) => ({ ui: { ...s.ui, notice } })),
  clearNotice: () => set((s) => ({ ui: { ...s.ui, notice: null } })),
  setMoneyball: (moneyball) => set((s) => ({ ui: { ...s.ui, moneyball } })),
  setSigningsMoneyball: (signingsMoneyball) => set((s) => ({ ui: { ...s.ui, signingsMoneyball } })),
  setSearch: (key, text) => set((s) => ({ ui: { ...s.ui, searches: { ...s.ui.searches, [key]: text } } })),
  toggleCompare: (uid) =>
    set((s) => {
      const { compare } = s.ui;
      if (compare.includes(uid)) return { ui: { ...s.ui, compare: compare.filter((u) => u !== uid) } };
      return compare.length < MAX_COMPARE ? { ui: { ...s.ui, compare: [...compare, uid] } } : s;
    }),
  setCompare: (uids) => set((s) => ({ ui: { ...s.ui, compare: [...new Set(uids)].slice(0, MAX_COMPARE) } })),
  setGraphAxes: (key, axes) =>
    set((s) => ({ ui: { ...s.ui, graphs: { ...s.ui.graphs, axes: { ...s.ui.graphs.axes, [key]: axes } } } })),
  setGraphLabels: (labels) => set((s) => ({ ui: { ...s.ui, graphs: { ...s.ui.graphs, labels } } })),
  setCartView: (cartView) => set((s) => ({ ui: { ...s.ui, cartView } })),
  setElencoView: (elenco) => set((s) => ({ ui: { ...s.ui, elenco } })),
  toggleSidebar: () => set((s) => ({ ui: { ...s.ui, sidebarCollapsed: !s.ui.sidebarCollapsed } })),
  setRole: (role) => set((s) => ({ ui: { ...s.ui, role } })),
  setPeriod: (period) => set((s) => ({ ui: { ...s.ui, period } })),
  setPitchView: (pitchView) => set((s) => ({ ui: { ...s.ui, pitchView } })),
});

export const savedUi = ({
  mode,
  moneyball,
  signingsMoneyball,
  sidebarCollapsed,
  role,
  pitchView,
  period,
}: UiState) => ({
  mode,
  moneyball,
  signingsMoneyball,
  sidebarCollapsed,
  role,
  pitchView,
  period,
});

export function restoreUi(raw: unknown): UiState {
  const r = fieldsOf(raw);
  return {
    ...defaultUi(),
    mode: oneOf(r.mode, VALUE_MODES) ?? VALUE_MODE.value,
    moneyball: r.moneyball === true,
    signingsMoneyball: r.signingsMoneyball === true,
    sidebarCollapsed: r.sidebarCollapsed === true,
    role: isRoleId(r.role) ? r.role : null,
    pitchView: oneOf(r.pitchView, PITCH_VIEWS) ?? PITCH_VIEW.ip,
    period: isPeriod(r.period) ? r.period : CURRENT_SEASON,
  };
}
