import { useTranslation } from "react-i18next";
import { useFormatMoney } from "@/store/index";
import { signedAmount } from "../lib/amount";
import { type Budget, type BudgetSource, type Money, sumOf } from "../lib/budget";
import { meterReading } from "../lib/meterReading";
import { BudgetMeter } from "./BudgetMeter";
import { BudgetRow } from "./BudgetRow";
import { GameHint } from "./GameHint";
import { GameValue } from "./GameValue";
import { ManualBudgetField, type OnManual } from "./ManualBudgetField";

export interface MeterProps {
  source: BudgetSource;
  budget: Budget;
  moves: { purchases: readonly Money[]; sales: readonly Money[] };
  onManual: OnManual;
}

export function TransferMeter({ source, budget, moves, onManual }: MeterProps) {
  const { t } = useTranslation("cart");
  const amount = useFormatMoney();
  const spent = sumOf(moves.purchases, "fee");
  const sold = sumOf(moves.sales, "fee");
  const hint = source.transferHint;
  const reading = meterReading({
    budget: source.transfer,
    left: budget.transferLeft,
    pct: budget.transferPct,
    over: budget.overTransfer,
    whole: t("budget.transfers.whole"),
    unknown: t("budget.unset", { ns: "common" }),
    amount,
  });

  return (
    <BudgetMeter
      title={t("budget.transfers.title")}
      budget={source.transfer}
      reading={reading}
      over={budget.overTransfer}
      segments={[{ id: "net-spend", value: spent - sold, className: "bg-fg-secondary" }]}
      overText={t("budget.transfers.over", { amount: amount(-(budget.transferLeft ?? 0)) })}
    >
      <BudgetRow label={t("budget.transfers.budget")}>
        {source.transferFromGame && source.transfer !== null ? (
          <GameValue value={source.transfer} amount={amount} />
        ) : (
          <ManualBudgetField
            field="transfer"
            name={t("budget.transfers.budgetName")}
            value={source.transfer}
            onManual={onManual}
          />
        )}
      </BudgetRow>
      <GameHint
        hint={hint}
        typed={source.transfer}
        useLabel={t("budget.transfers.use")}
        amount={amount}
        onUse={onManual && hint !== null ? () => onManual({ transfer: hint }) : null}
      />
      <BudgetRow label={t("budget.transfers.buys")}>{signedAmount(amount, spent, "−")}</BudgetRow>
      <BudgetRow label={t("budget.transfers.sales")}>{signedAmount(amount, sold, "+")}</BudgetRow>
    </BudgetMeter>
  );
}
