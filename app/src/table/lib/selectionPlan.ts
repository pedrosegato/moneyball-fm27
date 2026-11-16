import type { PlayerRecord } from "@/data/types";
import { CART_KINDS, type CartKind, cartKindOf, MAX_ITEMS } from "@/store/cart";
import { MAX_COMPARE } from "@/store/ui";
import { tableText } from "./tableText";

export interface CartMove {
  kind: CartKind;
  players: readonly PlayerRecord[];
  missing: readonly PlayerRecord[];
}

export function cartMoves(
  players: readonly PlayerRecord[],
  clubUid: number | null,
  inCart: (uid: number, kind: CartKind) => boolean,
): CartMove[] {
  const byKind: Record<CartKind, PlayerRecord[]> = { buy: [], sell: [] };
  for (const p of players) byKind[cartKindOf(p, clubUid)].push(p);
  return CART_KINDS.filter((kind) => byKind[kind].length > 0).map((kind) => ({
    kind,
    players: byKind[kind],
    missing: byKind[kind].filter((p) => !inCart(p.uid, kind)),
  }));
}

export function cartBlock(move: CartMove, moves: readonly CartMove[], cartSize: number): string | null {
  if (move.missing.length === 0) return null;
  const room = MAX_ITEMS - cartSize;
  const needed = moves.reduce((n, m) => n + m.missing.length, 0);
  if (needed <= room) return null;
  return room > 0
    ? tableText("action.cartFull", { max: MAX_ITEMS, room })
    : tableText("action.cartFullNone", { max: MAX_ITEMS });
}

export const compareBlock = (count: number): string | null =>
  count > MAX_COMPARE ? tableText("action.compareLimit", { max: MAX_COMPARE }) : null;

export const profileBlock = (count: number): string | null => (count === 1 ? null : tableText("action.profileLimit"));
