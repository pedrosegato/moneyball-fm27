import { Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PlayerSheet } from "@/player/components/PlayerSheet";
import { useAppStore } from "@/store/index";
import { CART_VIEW, type CartView } from "@/store/ui";
import { CartButton } from "./CartButton";
import { DataGate } from "./DataGate";
import { PageChunkLoading } from "./PageChunkLoading";
import { PageErrorBoundary } from "./PageErrorBoundary";
import { PageFor } from "./PageFor";
import { PAGE_NEEDS_DATA } from "./pageRegistry";
import { preloadPages, retryFailedPages } from "./pages";
import { type Route, useRoute } from "./Router";
import { PAGE } from "./routeIds";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";

const titleKeyOf = (route: Route, cartView: CartView) =>
  route.page === PAGE.cart && cartView === CART_VIEW.shortlist ? "shortlist" : route.page;

export function Shell() {
  const { t } = useTranslation("shell");
  const route = useRoute();
  const cartView = useAppStore((s) => s.ui.cartView);
  useEffect(preloadPages, []);
  const page = (
    <PageErrorBoundary key={route.page} onRetry={retryFailedPages}>
      <Suspense fallback={<PageChunkLoading />}>
        <PageFor route={route} />
      </Suspense>
    </PageErrorBoundary>
  );
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar route={route} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-(--topbar-height) shrink-0 items-center gap-4 border-b border-line-subtle pr-3 pl-6">
          <h1 className="shrink-0 truncate type-heading text-fg">
            {t(`page.${titleKeyOf(route, cartView)}`, { ns: "common" })}
          </h1>
          <div className="ml-auto flex min-w-0 items-center justify-end gap-1">
            <StatusBar />
            <CartButton current={route.page === PAGE.cart && cartView === CART_VIEW.cart} />
          </div>
        </header>
        {PAGE_NEEDS_DATA[route.page] ? (
          <div className="relative flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              <DataGate>{page}</DataGate>
            </div>
            <PlayerSheet />
          </div>
        ) : (
          page
        )}
      </div>
    </div>
  );
}
