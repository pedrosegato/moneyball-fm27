import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { Amount } from "../lib/amount";

interface GameHintProps {
  hint: number | null;
  typed: number | null;
  useLabel: string;
  amount: Amount;
  onUse: (() => void) | null;
}

export function GameHint({ hint, typed, useLabel, amount, onUse }: GameHintProps) {
  const { t } = useTranslation("cart");
  if (hint === null || hint === typed) return null;
  return (
    <dd className="col-span-2 -mt-0.5 flex items-center justify-end gap-1 type-caption text-fg-muted">
      <span className="tabular-nums" title={t("budget.hintTitle")}>
        {t("budget.hint", { amount: amount(hint) })}
      </span>
      {onUse && (
        <Button
          variant="ghost"
          size="xs"
          aria-label={t("budget.useLabel", { label: useLabel, amount: amount(hint) })}
          onClick={onUse}
        >
          {t("budget.use")}
        </Button>
      )}
    </dd>
  );
}
