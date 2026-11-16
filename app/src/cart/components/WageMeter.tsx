import { useTranslation } from "react-i18next";
import { EMPTY_VALUE } from "@/lib/constants";
import { perWagePeriod, wagePeriodSuffix } from "@/lib/money";
import { useFormatWage, useMoney } from "@/store/index";
import { signedAmount } from "../lib/amount";
import { sumOf } from "../lib/budget";
import { meterReading } from "../lib/meterReading";
import { BudgetMeter } from "./BudgetMeter";
import { BudgetRow } from "./BudgetRow";
import { GameHint } from "./GameHint";
import { GameValue } from "./GameValue";
import { ManualBudgetField } from "./ManualBudgetField";
import { Swatch } from "./Swatch";
import type { MeterProps } from "./TransferMeter";

interface WageMeterProps extends MeterProps {
  currentWageBill: number | null;
}

export function WageMeter({ source, budget, moves, currentWageBill, onManual }: WageMeterProps) {
  const { t } = useTranslation("cart");
  const amount = useFormatWage();
  const money = useMoney();
  const period = perWagePeriod(money);
  const newWages = sumOf(moves.purchases, "wage");
  const released = sumOf(moves.sales, "wage");
  const hint = source.wageHint;
  const reading = meterReading({
    budget: source.wageWeekly,
    left: budget.wageLeft,
    pct: budget.wagePct,
    over: budget.overWage,
    whole: t("budget.wages.whole"),
    unknown: t("budget.wages.unknown"),
    amount,
  });

  return (
    <BudgetMeter
      title={t("budget.wages.title")}
      budget={source.wageWeekly}
      reading={reading}
      over={budget.overWage}
      segments={[
        { id: "current-wages", value: (currentWageBill ?? 0) - released, className: "bg-fg-faint" },
        { id: "new-wages", value: newWages, className: "bg-fg-secondary" },
      ]}
      overText={t("budget.wages.over", { amount: amount(-(budget.wageLeft ?? 0)), period })}
    >
      <BudgetRow label={t("budget.wages.cap", { period })}>
        {source.wageFromGame && source.wageWeekly !== null ? (
          <GameValue value={source.wageWeekly} amount={amount} />
        ) : (
          <ManualBudgetField
            field="wageWeekly"
            name={t("budget.wages.capName", { period })}
            value={source.wageWeekly}
            suffix={wagePeriodSuffix(money)}
            onManual={onManual}
          />
        )}
      </BudgetRow>
      <GameHint
        hint={hint}
        typed={source.wageWeekly}
        useLabel={t("budget.wages.use")}
        amount={amount}
        onUse={onManual && hint !== null ? () => onManual({ wageWeekly: hint }) : null}
      />
      <BudgetRow
        label={
          <>
            <Swatch className="bg-fg-faint" />
            {t("budget.wages.bill")}
          </>
        }
        title={t("budget.wages.billHint")}
      >
        {currentWageBill === null ? EMPTY_VALUE : signedAmount(amount, currentWageBill, "−")}
      </BudgetRow>
      <BudgetRow
        label={
          <>
            <Swatch className="bg-fg-secondary" />
            {t("budget.wages.newWages")}
          </>
        }
      >
        {signedAmount(amount, newWages, "−")}
      </BudgetRow>
      <BudgetRow label={t("budget.wages.released")}>{signedAmount(amount, released, "+")}</BudgetRow>
    </BudgetMeter>
  );
}
