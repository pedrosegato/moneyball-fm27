import { useTranslation } from "react-i18next";
import { EMPTY_VALUE } from "@/lib/constants";
import type { ManualBudget } from "@/store/cart";
import { MoneyField } from "./MoneyField";

export type OnManual = ((patch: Partial<ManualBudget>) => void) | null;

interface ManualBudgetFieldProps {
  field: keyof ManualBudget;
  name: string;
  value: number | null;
  suffix?: string;
  onManual: OnManual;
}

export function ManualBudgetField({ field, name, value, suffix, onManual }: ManualBudgetFieldProps) {
  const { t } = useTranslation("cart");
  return (
    <MoneyField
      name={name}
      value={value}
      wage={field === "wageWeekly"}
      clearable
      placeholder={onManual ? t("budget.typePlaceholder") : EMPTY_VALUE}
      suffix={suffix}
      disabled={!onManual}
      className="w-34"
      onCommit={(v) => onManual?.({ [field]: v })}
    />
  );
}
