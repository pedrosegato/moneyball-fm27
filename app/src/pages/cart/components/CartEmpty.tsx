import { ShoppingCart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { appStore } from "@/store/index";
import { CART_VIEW } from "@/store/ui";

export function CartEmpty() {
  const { t } = useTranslation("cart");
  return (
    <EmptyState
      icon={ShoppingCart}
      title={t("empty.title")}
      description={t("empty.description")}
      action={
        <Button variant="outline" onClick={() => appStore.getState().setCartView(CART_VIEW.shortlist)}>
          {t("empty.openShortlist")}
        </Button>
      }
      className="h-full"
    />
  );
}
