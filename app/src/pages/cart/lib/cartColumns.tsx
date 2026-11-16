import { MoneyField } from "@/cart/components/MoneyField";
import { cartT } from "@/cart/lib/cartT";
import type { ReconciledItem } from "@/cart/lib/reconcile";
import type { PlayerRecord } from "@/data/types";
import { COLUMN } from "@/engine/columnIds";
import { type Money, perWagePeriod, wageAdjective, wagePeriodSuffix } from "@/lib/money";
import { CART_KIND, CART_STATUS } from "@/store/cart";
import { appStore } from "@/store/index";
import { NAME_COLUMN } from "@/table/columns/ids";
import { moneyExport, wageExport } from "@/table/columns/money";
import type { TableColumn } from "@/table/columns/types";
import { customColumn } from "@/table/lib/customColumn";
import { CartKindLabel } from "../components/CartKindLabel";
import { SettledAmount } from "../components/SettledAmount";
import { StatusChip } from "../components/StatusChip";
import { cartCaption } from "./cartCaption";
import { statusLabel } from "./cartStatus";

export const CART_COLUMN = { kind: "cartKind", status: "cartStatus", fee: "cartFee", wage: "cartWage" } as const;
export const CART_LEAD = Object.values(CART_COLUMN);
export const CART_FIXED = [COLUMN.perf, "value", "wage", COLUMN.monthsLeft] as const;
export const CART_SORT = { id: CART_COLUMN.kind, desc: false } as const;

type AmountField = "fee" | "wage";

interface CartSource {
  players: readonly PlayerRecord[];
  lineAt: ReadonlyMap<number, ReconciledItem>;
  money: Money;
}

interface AmountText {
  abbr: string;
  label: string;
  description: string;
  name(who: string): string;
}

function amountText(field: AmountField, money: Money): AmountText {
  if (field === "fee") {
    return {
      abbr: cartT("columns.fee.abbr"),
      label: cartT("columns.fee.label"),
      description: cartT("columns.fee.description"),
      name: (who) => cartT("columns.fee.name", { who }),
    };
  }
  const period = perWagePeriod(money);
  return {
    abbr: cartT("columns.wage.abbr", { suffix: wagePeriodSuffix(money) }),
    label: cartT("columns.wage.label", { period }),
    description: cartT("columns.wage.description", { period }),
    name: (who) => cartT("columns.wage.name", { adjective: wageAdjective(money), who }),
  };
}

function amountColumn(field: AmountField, { players, lineAt, money }: CartSource) {
  const values = Float64Array.from({ length: players.length }, (_, i) => lineAt.get(i)?.[field] ?? NaN);
  const text = amountText(field, money);
  const wage = field === "wage";
  return customColumn({
    id: wage ? CART_COLUMN.wage : CART_COLUMN.fee,
    abbr: text.abbr,
    label: text.label,
    description: text.description,
    width: 128,
    align: "end",
    sortKey: () => values,
    exports: [
      wage ? wageExport(text.abbr, values, money, { headerNamesPeriod: true }) : moneyExport(text.abbr, values, money),
    ],
    render(i, active) {
      const line = lineAt.get(i);
      if (!line) return null;
      if (line.status !== CART_STATUS.planned) return <SettledAmount value={line[field]} wage={wage} />;
      return (
        <MoneyField
          name={text.name(line.name)}
          value={line[field]}
          wage={wage}
          quiet
          tabIndex={active ? 0 : -1}
          className="w-full"
          onCommit={(v) => v !== null && appStore.getState().updateCartItem(line.uid, line.kind, { [field]: v })}
        />
      );
    },
  });
}

function kindColumn({ players, lineAt }: CartSource) {
  const order = Float64Array.from({ length: players.length }, (_, i) => {
    const line = lineAt.get(i);
    return line ? (line.kind === CART_KIND.buy ? 0 : 1) : NaN;
  });
  const abbr = cartT("columns.kind.abbr");
  return customColumn({
    id: CART_COLUMN.kind,
    abbr,
    label: cartT("columns.kind.label"),
    description: cartT("columns.kind.description"),
    width: 104,
    align: "start",
    sortKey: () => order,
    exports: [
      {
        header: abbr,
        get: (i) => {
          const line = lineAt.get(i);
          return line ? cartT(`kind.${line.kind}`) : null;
        },
      },
    ],
    render(i) {
      const line = lineAt.get(i);
      return line ? <CartKindLabel kind={line.kind} /> : null;
    },
  });
}

function statusColumn({ players, lineAt }: CartSource) {
  const order = Float64Array.from({ length: players.length }, (_, i) => {
    const status = lineAt.get(i)?.status;
    return status === undefined ? NaN : status === CART_STATUS.planned ? 0 : 1;
  });
  const abbr = cartT("columns.status.abbr");
  return customColumn({
    id: CART_COLUMN.status,
    abbr,
    label: cartT("columns.status.label"),
    description: cartT("columns.status.description"),
    width: 128,
    align: "start",
    sortKey: () => order,
    exports: [
      {
        header: abbr,
        get: (i) => {
          const line = lineAt.get(i);
          return line ? statusLabel(line.status) : null;
        },
      },
    ],
    render(i) {
      const line = lineAt.get(i);
      return line ? <StatusChip status={line.status} /> : null;
    },
  });
}

export function cartColumns(base: readonly TableColumn[], source: CartSource): TableColumn[] {
  const { players, lineAt } = source;
  const named = base.map((c) =>
    c.id === NAME_COLUMN && c.kind === "text"
      ? { ...c, caption: (i: number) => cartCaption(lineAt.get(i), players[i]) }
      : c,
  );
  return [
    ...named,
    kindColumn(source),
    statusColumn(source),
    amountColumn("fee", source),
    amountColumn("wage", source),
  ];
}
