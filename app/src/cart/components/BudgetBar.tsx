import type { MeterProps } from "./TransferMeter";
import { TransferMeter } from "./TransferMeter";
import { WageMeter } from "./WageMeter";

interface BudgetBarProps extends MeterProps {
  currentWageBill: number | null;
}

export function BudgetBar({ source, budget, moves, currentWageBill, onManual }: BudgetBarProps) {
  return (
    <div className="flex flex-col gap-6">
      <TransferMeter source={source} budget={budget} moves={moves} onManual={onManual} />
      <WageMeter source={source} budget={budget} moves={moves} currentWageBill={currentWageBill} onManual={onManual} />
    </div>
  );
}
