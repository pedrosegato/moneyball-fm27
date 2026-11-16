import { useTranslation } from "react-i18next";
import { Threshold } from "@/components/Threshold";
import { MAX_SIGNINGS } from "@/store/cart";
import { useFormatMoney } from "@/store/index";
import { slotsText } from "../lib/slotsText";

interface CartSlotsProps {
  target: number;
  slots: number;
  avgPerSlot: number | null;
  onTarget: ((target: number) => void) | null;
}

export function CartSlots({ target, slots, avgPerSlot, onTarget }: CartSlotsProps) {
  const { t } = useTranslation("cart");
  const amount = useFormatMoney();
  return (
    <section aria-labelledby="cart-slots" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id="cart-slots" className="type-label text-fg-secondary">
          {t("slots.title")}
        </h2>
        {onTarget && (
          <Threshold
            label={t("slots.target")}
            name={t("slots.targetName")}
            hint={t("slots.targetHint")}
            value={target}
            min={0}
            max={MAX_SIGNINGS}
            decimals={0}
            onCommit={onTarget}
          />
        )}
      </div>
      <p className="type-label tabular-nums text-fg-muted">{slotsText(slots, avgPerSlot, amount)}</p>
    </section>
  );
}
