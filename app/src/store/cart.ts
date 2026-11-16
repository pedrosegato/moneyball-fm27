import type { StateCreator } from "zustand";
import { reconcileCart } from "@/cart/lib/reconcile";
import type { PlayerRecord, Snapshot } from "@/data/types";
import { contractedTo, marketValue } from "@/engine/club";
import type { AppState } from "./index";
import { CLUB_UID, fieldsOf, finiteIn, listOf, oneOf, positiveInt, recordOf, text, uniqueBy } from "./sanitize";

export const CART_KIND = { buy: "buy", sell: "sell" } as const;
export type CartKind = (typeof CART_KIND)[keyof typeof CART_KIND];
export const CART_KINDS: readonly CartKind[] = Object.values(CART_KIND);

export const cartKindOf = (player: PlayerRecord, clubUid: number | null): CartKind =>
  contractedTo(player, clubUid) ? CART_KIND.sell : CART_KIND.buy;

export const CART_STATUS = {
  planned: "previsto",
  signed: "contratado",
  sold: "vendido",
  unavailable: "indisponível",
} as const;
export type CartStatus = (typeof CART_STATUS)[keyof typeof CART_STATUS];
const SETTLED = [CART_STATUS.signed, CART_STATUS.sold] as const satisfies readonly CartStatus[];
type Settled = (typeof SETTLED)[number];
export const isSettled = (status: CartStatus | undefined): status is Settled =>
  (SETTLED as readonly string[]).includes(status ?? "");

export interface CartItem {
  uid: number;
  kind: CartKind;
  fee: number;
  wage: number;
  name: string;
  status?: CartStatus;
  settledFor?: number;
}

export interface ManualBudget {
  transfer: number | null;
  wageWeekly: number | null;
}

export interface CartState {
  items: CartItem[];
  budgets: Record<string, ManualBudget>;
  targets: Record<string, number>;
}

export type MoneyPatch = Partial<Pick<CartItem, "fee" | "wage">>;

export interface CartSlice {
  cart: CartState;
  addToCart(item: CartItem): void;
  addManyToCart(items: readonly CartItem[]): void;
  removeFromCart(uid: number, kind: CartKind): void;
  removeManyFromCart(entries: readonly Pick<CartItem, "uid" | "kind">[]): void;
  updateCartItem(uid: number, kind: CartKind, patch: MoneyPatch): void;
  settleCart(snapshot: Snapshot, myClubUid: number | null): void;
  clearSettled(clubUid: number | null): void;
  setManualBudget(clubUid: number, budget: ManualBudget): void;
  setSigningTarget(clubUid: number, target: number | null): void;
}

export function cartItemOf(player: PlayerRecord, kind: CartKind): CartItem {
  const value = marketValue(player);
  return { uid: player.uid, kind, fee: Number.isNaN(value) ? 0 : value, wage: player.wage ?? 0, name: player.name };
}

export const MAX_ITEMS = 500;
export const MAX_SIGNINGS = 99;
const sameEntry = (a: Pick<CartItem, "uid" | "kind">, b: Pick<CartItem, "uid" | "kind">) =>
  a.uid === b.uid && a.kind === b.kind;
const entryKey = ({ uid, kind }: Pick<CartItem, "uid" | "kind">) => `${kind}:${uid}`;

export const createCartSlice: StateCreator<AppState, [], [], CartSlice> = (set) => ({
  cart: { items: [], budgets: {}, targets: {} },
  addToCart: (item) =>
    set((s) =>
      s.cart.items.some((i) => sameEntry(i, item)) ? s : { cart: { ...s.cart, items: [...s.cart.items, item] } },
    ),
  addManyToCart: (items) =>
    set((s) => {
      const added = uniqueBy(items, entryKey).filter((item) => !s.cart.items.some((i) => sameEntry(i, item)));
      return added.length ? { cart: { ...s.cart, items: [...s.cart.items, ...added] } } : s;
    }),
  removeFromCart: (uid, kind) =>
    set((s) => ({ cart: { ...s.cart, items: s.cart.items.filter((i) => !sameEntry(i, { uid, kind })) } })),
  removeManyFromCart: (entries) => {
    const gone = new Set(entries.map(entryKey));
    set((s) => ({ cart: { ...s.cart, items: s.cart.items.filter((i) => !gone.has(entryKey(i))) } }));
  },
  updateCartItem: (uid, kind, patch) =>
    set((s) => ({
      cart: { ...s.cart, items: s.cart.items.map((i) => (sameEntry(i, { uid, kind }) ? { ...i, ...patch } : i)) },
    })),
  settleCart: (snapshot, myClubUid) =>
    set((s) => {
      if (myClubUid === null) return s;
      const lines = reconcileCart(s.cart.items, snapshot, myClubUid);
      const isNew = (k: number) => {
        const item = s.cart.items[k];
        return isSettled(lines[k].status) && (item.status !== lines[k].status || item.settledFor !== myClubUid);
      };
      if (!lines.some((_, k) => isNew(k))) return s;
      const items = s.cart.items.map((item, k) =>
        isNew(k) ? { ...item, status: lines[k].status, settledFor: myClubUid } : item,
      );
      return { cart: { ...s.cart, items } };
    }),
  clearSettled: (clubUid) =>
    set((s) => ({
      cart: { ...s.cart, items: s.cart.items.filter((i) => !(isSettled(i.status) && i.settledFor === clubUid)) },
    })),
  setManualBudget: (clubUid, budget) =>
    set((s) => ({ cart: { ...s.cart, budgets: { ...s.cart.budgets, [String(clubUid)]: budget } } })),
  setSigningTarget: (clubUid, target) =>
    set((s) => {
      const targets = { ...s.cart.targets };
      if (target === null) delete targets[String(clubUid)];
      else targets[String(clubUid)] = target;
      return { cart: { ...s.cart, targets } };
    }),
});

const money = (v: unknown) => finiteIn(v, 0, Number.MAX_VALUE);

function restoreItem(raw: unknown): CartItem | null {
  const r = fieldsOf(raw);
  const uid = positiveInt(r.uid);
  const kind = oneOf(r.kind, CART_KINDS);
  const fee = money(r.fee);
  const wage = money(r.wage);
  const name = text(r.name, 200);
  if (uid === null || kind === null || fee === null || wage === null || name === null) return null;
  const status = oneOf(r.status, SETTLED);
  const settledFor = positiveInt(r.settledFor);
  return status && settledFor !== null
    ? { uid, kind, fee, wage, name, status, settledFor }
    : { uid, kind, fee, wage, name };
}

function restoreTarget(raw: unknown, clubUid: string): number | null {
  if (!CLUB_UID.test(clubUid)) return null;
  return Number.isInteger(raw) ? finiteIn(raw, 0, MAX_SIGNINGS) : null;
}

function restoreBudget(raw: unknown, clubUid: string): ManualBudget | null {
  if (!CLUB_UID.test(clubUid)) return null;
  const r = fieldsOf(raw);
  return { transfer: money(r.transfer), wageWeekly: money(r.wageWeekly) };
}

export function restoreCart(raw: unknown): CartState {
  const r = fieldsOf(raw);
  return {
    items: uniqueBy(listOf(r.items, restoreItem, MAX_ITEMS), entryKey),
    budgets: recordOf(r.budgets, restoreBudget),
    targets: recordOf(r.targets, restoreTarget),
  };
}
