import { cartT } from "@/cart/lib/cartT";
import { formatMoney, formatWage } from "@/lib/money";
import { useMoney } from "@/store/index";

export function SettledAmount({ value, wage }: { value: number; wage: boolean }) {
  const money = useMoney();
  return (
    <span className="tabular-nums text-fg-faint" title={cartT("columns.settled")}>
      {wage ? formatWage(value, money) : formatMoney(value, money)}
    </span>
  );
}
