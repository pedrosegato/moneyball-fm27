import type { ReconciledItem } from "@/cart/lib/reconcile";
import { POUNDS } from "@/lib/money";
import { CART_STATUS } from "@/store/cart";
import { demoPlayers } from "@/table/fixtures";
import { toCsv } from "@/table/lib/csv";
import { CART_COLUMN, cartColumns } from "./cartColumns";

const line = (uid: number, kind: ReconciledItem["kind"], fee: number, wage: number): ReconciledItem => ({
  uid,
  kind,
  fee,
  wage,
  name: `J${uid}`,
  status: CART_STATUS.planned,
});

const euros = { code: "EUR", symbol: "€", name: "Euro", rate: 1.1641011238098145, wagePeriod: "month" } as const;
const lines = (csv: string) => csv.replace(/^﻿/, "").split("\r\n");

function cartCsv(money: typeof POUNDS) {
  const players = demoPlayers(2);
  const lineAt = new Map([
    [0, line(1, "buy", 2_000_000, 10_000)],
    [1, line(2, "sell", 1_500_000, 8_000)],
  ]);
  const amounts = cartColumns([], { players, lineAt, money }).filter(
    (c) => c.id === CART_COLUMN.fee || c.id === CART_COLUMN.wage,
  );
  return lines(toCsv(Uint32Array.of(0, 1), amounts, "value"));
}

describe("cart columns", () => {
  it("export the fee and the wage in the game's currency, the wage in the game's period", () => {
    const [header, buy, sell] = cartCsv(euros);
    expect(header).toBe("Taxa (€);Salário/mês (€)");
    expect(buy).toBe("2328202;50444");
    expect(sell).toBe("1746152;40355");
  });

  it("export pounds a week when the game's money is unknown", () => {
    const [header, buy] = cartCsv(POUNDS);
    expect(header).toBe("Taxa (£);Salário/sem (£)");
    expect(buy).toBe("2000000;10000");
  });
});
