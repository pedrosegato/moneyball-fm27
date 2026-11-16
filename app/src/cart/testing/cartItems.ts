import { POS_NAMES } from "@/engine/positions";
import type { CartItem } from "@/store/cart";

export const MY = 301344;
export const OTHER = 5555;

export const item = (uid: number, kind: CartItem["kind"], fee = 1_000_000, wage = 10_000): CartItem => ({
  uid,
  kind,
  fee,
  wage,
  name: `Jogador ${uid}`,
});

export function posWith(ratings: Partial<Record<(typeof POS_NAMES)[number], number>>): number[] {
  return POS_NAMES.map((p) => ratings[p] ?? 1);
}
