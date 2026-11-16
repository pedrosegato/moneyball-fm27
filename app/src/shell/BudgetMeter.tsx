import { useTranslation } from "react-i18next";
import { useCartBudget } from "@/cart/hooks/useCartBudget";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/store/index";
import { CART_VIEW } from "@/store/ui";
import { cartLink } from "./cartLink";

const METER =
  "flex w-[calc(var(--rail-width)-1rem)] flex-col gap-1.5 rounded-xl border border-line bg-surface-raised p-2.5 type-label";

export function BudgetMeter() {
  const { t } = useTranslation("shell");
  const amount = useFormatMoney();
  const { source, moves, budget } = useCartBudget();
  const link = cartLink(CART_VIEW.cart);
  const total = source.transfer;

  if (total === null || budget.transferLeft === null) {
    return (
      <section aria-label={t("budget.title")} className={METER}>
        <span className="text-fg-muted">{t("budget.title")}</span>
        <span className="text-fg-secondary">{t("budget.unset", { ns: "common" })}</span>
        <a
          href={link.href}
          onClick={link.onClick}
          className="w-fit rounded-xs text-signal-text underline-offset-2 focus-ring hover:underline"
        >
          {t("budget.define")}
        </a>
      </section>
    );
  }

  const left = budget.transferLeft;
  const over = budget.overTransfer;
  const used = moves.purchases.reduce((sum, m) => sum + m.fee, 0) - moves.sales.reduce((sum, m) => sum + m.fee, 0);
  const share = (v: number) => (total > 0 ? `${Math.min(100, Math.max(0, (v / total) * 100))}%` : "0%");
  return (
    <section aria-label={t("budget.title")} className={METER}>
      <div className="flex justify-between gap-2 text-fg-muted">
        <span>{t("budget.title")}</span>
        <b className="font-semibold tabular-nums text-fg">{amount(total)}</b>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-control" aria-hidden>
        <i
          className={cn(
            "rounded-full transition-[width] duration-(--duration-panel) ease-out motion-reduce:transition-none",
            over ? "bg-destructive" : "bg-fg-secondary",
          )}
          style={{ width: over ? "100%" : share(used) }}
        />
      </div>
      <span className={cn("truncate tabular-nums", over ? "text-destructive" : "text-fg-muted")}>
        {over
          ? t("budget.over", { ns: "common", amount: amount(-left) })
          : t("budget.leftPct", { ns: "common", amount: amount(left), pct: Math.round(budget.transferPct ?? 0) })}
      </span>
    </section>
  );
}
