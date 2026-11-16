import { useTranslation } from "react-i18next";
import type { Amount } from "../lib/amount";

export function GameValue({ value, amount }: { value: number; amount: Amount }) {
  const { t } = useTranslation("cart");
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="type-caption text-fg-muted">{t("budget.fromGame")}</span>{" "}
      <span className="font-semibold text-fg">{amount(value)}</span>
    </span>
  );
}
