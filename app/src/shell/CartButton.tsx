import { ShoppingCart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { buttonVariants } from "@/components/ui/button-variants";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/index";
import { CART_VIEW } from "@/store/ui";
import { cartLink } from "./cartLink";

const BADGE_MAX = 99;

export function CartButton({ current }: { current: boolean }) {
  const { t } = useTranslation("shell");
  const count = useAppStore((s) => s.cart.items.length);
  const link = cartLink(CART_VIEW.cart);
  const label = t("cartButton.label", { count });
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <a
            href={link.href}
            onClick={link.onClick}
            aria-label={label}
            aria-current={current ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "relative text-fg-muted hover:text-fg aria-[current=page]:bg-surface-hover aria-[current=page]:text-fg",
            )}
          />
        }
      >
        <ShoppingCart aria-hidden />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute top-0.5 right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-semibold tabular-nums text-primary-foreground ring-2 ring-background"
          >
            {count > BADGE_MAX ? `${BADGE_MAX}+` : count}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
