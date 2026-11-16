import { useTranslation } from "react-i18next";
import { CountSegmentedControl } from "@/components/CountSegmentedControl";
import { Page } from "@/components/Page";
import { PageToolbar } from "@/components/PageToolbar";
import { Button } from "@/components/ui/button";
import { appStore } from "@/store/index";
import { CART_VIEW, type CartView } from "@/store/ui";
import { CartContents } from "./cart/components/CartContents";
import { useCartPage } from "./cart/hooks/useCartPage";
import { Shortlist } from "./Shortlist";

export function Cart() {
  const { t } = useTranslation("cart");
  const { view, setView, cartCount, shortlistCount, club, settled } = useCartPage();
  return (
    <Page>
      <PageToolbar className="flex-nowrap gap-3">
        <CountSegmentedControl<CartView>
          aria-label={t("view")}
          value={view}
          onValueChange={setView}
          segments={[
            { value: CART_VIEW.cart, label: t("page.carrinho", { ns: "common" }), count: cartCount },
            { value: CART_VIEW.shortlist, label: t("page.shortlist", { ns: "common" }), count: shortlistCount },
          ]}
        />
        {view === CART_VIEW.cart && settled && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-fg-muted"
            title={t("clearSettledHint")}
            onClick={() => appStore.getState().clearSettled(club)}
          >
            {t("clearSettled")}
          </Button>
        )}
      </PageToolbar>
      {view === CART_VIEW.cart ? <CartContents /> : <Shortlist />}
    </Page>
  );
}
