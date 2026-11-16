import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { myClubUid } from "@/data/myClub";
import { useAppStore } from "@/store/index";
import type { SelectionContext } from "../lib/selectionActions";
import { cartMoves } from "../lib/selectionPlan";
import { CartMoveButton } from "./CartMoveButton";

export function CartActions({ players }: SelectionContext) {
  const { clubUid, items } = useAppStore(
    useShallow((s) => ({ clubUid: s.data.snapshot ? myClubUid(s.data.snapshot) : null, items: s.cart.items })),
  );
  const moves = useMemo(() => {
    const held = new Set(items.map((i) => `${i.kind}:${i.uid}`));
    return cartMoves(players, clubUid, (uid, kind) => held.has(`${kind}:${uid}`));
  }, [players, clubUid, items]);
  return moves.map((move, k) => <CartMoveButton key={move.kind} move={move} moves={moves} primary={k === 0} />);
}
