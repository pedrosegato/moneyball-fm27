import { playerRecord, snapshotOf } from "@/engine/testing/records";
import { item, MY, OTHER } from "../testing/cartItems";
import { computeBudget } from "./budget";
import { plannedMoves, reconcileCart, wageBill } from "./reconcile";

describe("reconcileCart", () => {
  it("cart reconciles signed player", () => {
    const signed = playerRecord({ club_uid: MY, club: "MFC" });
    const elsewhere = playerRecord({ club_uid: OTHER });
    const loanee = playerRecord({ club_uid: MY, owner: "Flamengo", owner_uid: OTHER });
    const snapshot = snapshotOf([signed, elsewhere, loanee]);
    const lines = reconcileCart(
      [item(signed.uid, "buy"), item(elsewhere.uid, "buy"), item(loanee.uid, "buy")],
      snapshot,
      MY,
    );
    expect(lines.map((l) => l.status)).toEqual(["contratado", "previsto", "previsto"]);
  });

  it('cart reconciles missing uid as "indisponível"', () => {
    const snapshot = snapshotOf([playerRecord({ club_uid: OTHER })]);
    const gone = [item(999_001, "buy", 4_000_000, 30_000), item(999_002, "sell", 2_000_000, 12_000)];
    const lines = reconcileCart(gone, snapshot, MY);
    expect(lines.map((l) => l.status)).toEqual(["indisponível", "indisponível"]);
    expect(lines[0]).toMatchObject({ name: "Jogador 999001", fee: 4_000_000 });
    expect(plannedMoves(lines)).toEqual({ purchases: [], sales: [] });
  });

  it("marks a sale sold once the player has left the club, but not while he is out on loan", () => {
    const sold = playerRecord({ club_uid: OTHER });
    const loanedOut = playerRecord({ club_uid: OTHER, owner: "MFC", owner_uid: MY });
    const stays = playerRecord({ club_uid: MY });
    const lines = reconcileCart(
      [item(sold.uid, "sell"), item(loanedOut.uid, "sell"), item(stays.uid, "sell")],
      snapshotOf([sold, loanedOut, stays]),
      MY,
    );
    expect(lines.map((l) => l.status)).toEqual(["vendido", "previsto", "previsto"]);
  });

  it("keeps a move the game already settled, whatever happens to the player later", () => {
    const resold = playerRecord({ club_uid: OTHER });
    const lines = reconcileCart(
      [
        { ...item(resold.uid, "buy"), status: "contratado", settledFor: MY },
        { ...item(424242, "sell"), status: "vendido", settledFor: MY },
      ],
      snapshotOf([resold]),
      MY,
    );
    expect(lines.map((l) => l.status)).toEqual(["contratado", "vendido"]);
  });

  it("ignores a move settled for another club: another save's signing is planned again here", () => {
    const target = playerRecord({ club_uid: MY });
    const seller = playerRecord({ club_uid: MY });
    const settledInA = [
      { ...item(target.uid, "buy", 5_000_000, 20_000), status: "contratado" as const, settledFor: MY },
      { ...item(seller.uid, "sell", 2_000_000, 9_000), status: "vendido" as const, settledFor: MY },
    ];
    const lines = reconcileCart(settledInA, snapshotOf([target, seller]), OTHER);
    expect(lines.map((l) => l.status)).toEqual(["previsto", "vendido"]);
    expect(plannedMoves(lines).purchases).toEqual([{ fee: 5_000_000, wage: 20_000 }]);
    const atB = reconcileCart(
      settledInA,
      snapshotOf([
        { ...target, club_uid: 77 },
        { ...seller, club_uid: OTHER },
      ]),
      OTHER,
    );
    expect(atB.map((l) => l.status)).toEqual(["previsto", "previsto"]);
  });

  it("cannot tell a move happened without the human club", () => {
    const p = playerRecord({ club_uid: OTHER });
    expect(
      reconcileCart([item(p.uid, "buy"), item(p.uid, "sell")], snapshotOf([p]), null).map((l) => l.status),
    ).toEqual(["previsto", "previsto"]);
  });

  it("does not count a signed player twice: his wage is in the bill, his fee left the game's budget", () => {
    const signed = playerRecord({ club_uid: MY, wage: 40_000 });
    const squad = playerRecord({ club_uid: MY, wage: 60_000 });
    const target = playerRecord({ club_uid: OTHER, wage: 20_000 });
    const snapshot = snapshotOf([signed, squad, target]);
    const lines = reconcileCart(
      [item(signed.uid, "buy", 8_000_000, 40_000), item(target.uid, "buy", 3_000_000, 20_000)],
      snapshot,
      MY,
    );
    const moves = plannedMoves(lines);
    expect(moves.purchases).toEqual([{ fee: 3_000_000, wage: 20_000 }]);
    const budget = computeBudget({
      transferBudget: 10_000_000,
      wageBudgetWeekly: 150_000,
      currentWageBill: wageBill(snapshot.players, MY),
      ...moves,
      slotsLeft: 0,
    });
    expect(budget.transferLeft).toBe(7_000_000);
    expect(budget.wageLeft).toBe(150_000 - 100_000 - 20_000);
  });
});

describe("wageBill", () => {
  it("sums the weekly wages of the club's contracts, loaned-out players in and loanees out", () => {
    const players = [
      playerRecord({ club_uid: MY, wage: 50_000 }),
      playerRecord({ club_uid: OTHER, owner: "MFC", owner_uid: MY, wage: 10_000 }),
      playerRecord({ club_uid: MY, owner: "Flamengo", owner_uid: OTHER, wage: 30_000 }),
      playerRecord({ club_uid: MY, wage: null }),
      playerRecord({ club_uid: OTHER, wage: 99_000 }),
    ];
    expect(wageBill(players, MY)).toBe(60_000);
    expect(wageBill(players, null)).toBe(0);
  });
});
