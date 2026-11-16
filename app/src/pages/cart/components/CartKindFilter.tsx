import { useTranslation } from "react-i18next";
import { CountSegmentedControl } from "@/components/CountSegmentedControl";
import { ALL } from "@/lib/constants";
import { CART_KIND, type CartKind } from "@/store/cart";
import type { CartKindFilter as Filter } from "../hooks/useCartLines";

interface CartKindFilterProps {
  value: Filter;
  counts: Record<CartKind, number>;
  onChange(kind: Filter): void;
}

export function CartKindFilter({ value, counts, onChange }: CartKindFilterProps) {
  const { t } = useTranslation("cart");
  return (
    <CountSegmentedControl<Filter>
      aria-label={t("table.move")}
      value={value}
      onValueChange={onChange}
      all={{ value: ALL, count: counts.buy + counts.sell }}
      segments={[
        { value: CART_KIND.buy, label: t("table.buys"), count: counts.buy },
        { value: CART_KIND.sell, label: t("table.sales"), count: counts.sell },
      ]}
    />
  );
}
