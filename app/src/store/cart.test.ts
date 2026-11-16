import { demoPlayer } from "@/table/fixtures";
import { CART_STATUS, cartKindOf, isSettled } from "./cart";

describe("cartKindOf", () => {
  it("sells a player under contract with your club and buys anyone else", () => {
    const mine = demoPlayer(0, { club_uid: 77, owner: null, owner_uid: null });
    const theirs = demoPlayer(1, { club_uid: 12 });
    expect(cartKindOf(mine, 77)).toBe("sell");
    expect(cartKindOf(theirs, 77)).toBe("buy");
    expect(cartKindOf(mine, null)).toBe("buy");
  });
});

describe("isSettled", () => {
  it("is true only for a move the game already shows done", () => {
    expect(isSettled(CART_STATUS.signed)).toBe(true);
    expect(isSettled(CART_STATUS.sold)).toBe(true);
    expect(isSettled(CART_STATUS.planned)).toBe(false);
    expect(isSettled(CART_STATUS.unavailable)).toBe(false);
    expect(isSettled(undefined)).toBe(false);
  });
});
