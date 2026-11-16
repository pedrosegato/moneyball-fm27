import { Settings } from "lucide-react";
import { useId, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/index";
import { CART_VIEW } from "@/store/ui";
import { BudgetMeter } from "./BudgetMeter";
import { CollapseToggle } from "./CollapseToggle";
import { cartLink } from "./cartLink";
import { NavItem } from "./NavItem";
import { NAV_PAGES } from "./pageRegistry";
import { Reveal } from "./Reveal";
import { hrefOf, type Route } from "./Router";
import { PAGE } from "./routeIds";
import { NAV_LABEL } from "./sidebarStyles";

export function Sidebar({ route }: { route: Route }) {
  const { t } = useTranslation("shell");
  const collapsed = useAppStore((s) => s.ui.sidebarCollapsed);
  const cartView = useAppStore((s) => s.ui.cartView);
  const railId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const rail = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const active = document.activeElement;
    if (collapsed && active instanceof HTMLElement && rail.current?.contains(active) && active.closest("[inert]")) {
      toggle.current?.focus();
    }
  }, [collapsed]);

  return (
    <aside
      ref={rail}
      id={railId}
      aria-label={t("sidebar.label")}
      data-collapsed={collapsed}
      className={cn(
        "group/rail relative flex shrink-0 flex-col border-r border-line-subtle bg-surface-rail transition-[width] duration-(--duration-panel) ease-out motion-reduce:transition-none",
        collapsed ? "w-(--rail-width-collapsed)" : "w-(--rail-width)",
      )}
    >
      <CollapseToggle collapsed={collapsed} controls={railId} ref={toggle} />
      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden">
        <div className="flex h-(--topbar-height) shrink-0 items-center gap-2 pl-3.5">
          <span
            aria-hidden
            className="grid size-5 shrink-0 place-items-center rounded-[0.3125rem] bg-primary text-[0.625rem] font-bold tabular-nums text-primary-foreground"
          >
            27
          </span>
          <span className={cn("type-heading text-fg", NAV_LABEL)}>{t("sidebar.brand")}</span>
        </div>
        <nav aria-label={t("sidebar.nav")} className="flex flex-col gap-0.5 px-2 pt-1">
          {NAV_PAGES.map(({ page, icon }) => {
            const shortlist = page === PAGE.cart;
            return (
              <NavItem
                key={page}
                href={hrefOf({ page })}
                current={route.page === page && (!shortlist || cartView === CART_VIEW.shortlist)}
                icon={icon}
                label={t(`page.${shortlist ? "shortlist" : page}`, { ns: "common" })}
                collapsed={collapsed}
                onClick={shortlist ? cartLink(CART_VIEW.shortlist).onClick : undefined}
              />
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2 p-2">
          <Reveal open={!collapsed}>
            <BudgetMeter />
          </Reveal>
          <NavItem
            href={hrefOf({ page: PAGE.config })}
            current={route.page === PAGE.config}
            icon={Settings}
            label={t("page.config", { ns: "common" })}
            collapsed={collapsed}
          />
        </div>
      </div>
    </aside>
  );
}
