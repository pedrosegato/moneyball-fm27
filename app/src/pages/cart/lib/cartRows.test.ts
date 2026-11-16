import type { ReconciledItem } from "@/cart/lib/reconcile";
import { cartRows } from "./cartRows";

const line = (uid: number, kind: "buy" | "sell", status: ReconciledItem["status"]): ReconciledItem => ({
  uid,
  kind,
  status,
  fee: 1,
  wage: 1,
  name: `J${uid}`,
});
const indexOf = (uid: number) => (uid === 404 ? undefined : uid * 10);

describe("cart rows", () => {
  it("lists one row per player in the cart's order, each with the move it shows", () => {
    const { rows, lineAt, missing } = cartRows(
      [line(1, "buy", "previsto"), line(3, "sell", "previsto"), line(2, "buy", "contratado")],
      indexOf,
    );
    expect([...rows]).toEqual([10, 30, 20]);
    expect(lineAt.get(30)!.kind).toBe("sell");
    expect(missing).toEqual([]);
  });

  it("keeps the players the snapshot lacks apart, for the strip above the table", () => {
    const { rows, missing } = cartRows([line(404, "buy", "indisponível"), line(1, "buy", "previsto")], indexOf);
    expect([...rows]).toEqual([10]);
    expect(missing.map((l) => l.uid)).toEqual([404]);
  });

  it("shows the planned move of a player who is both a settled signing and a planned sale", () => {
    const { rows, lineAt } = cartRows([line(1, "buy", "contratado"), line(1, "sell", "previsto")], indexOf);
    expect([...rows]).toEqual([10]);
    expect(lineAt.get(10)).toMatchObject({ kind: "sell", status: "previsto" });
  });
});
