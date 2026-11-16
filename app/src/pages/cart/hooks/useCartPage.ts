import { useShallow } from "zustand/react/shallow";
import { myClubUid } from "@/data/myClub";
import { isSettled } from "@/store/cart";
import { useAppStore } from "@/store/index";

export function useCartPage() {
  return useAppStore(
    useShallow((s) => {
      const club = s.data.snapshot ? myClubUid(s.data.snapshot) : null;
      return {
        view: s.ui.cartView,
        setView: s.setCartView,
        cartCount: s.cart.items.length,
        shortlistCount: new Set(s.shortlist.folders.flatMap((f) => f.uids)).size,
        club,
        settled: s.cart.items.some((i) => isSettled(i.status) && i.settledFor === club),
      };
    }),
  );
}
