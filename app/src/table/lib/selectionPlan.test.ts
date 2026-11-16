import { demoPlayer } from "../fixtures";
import { cartBlock, cartMoves, compareBlock, profileBlock } from "./selectionPlan";

const MY = 301344;
const target = demoPlayer(1, { name: "Alvo", club_uid: 50 });
const another = demoPlayer(2, { name: "Outro Alvo", club_uid: 51 });
const ours = demoPlayer(3, { name: "Nosso", club: "MFC", club_uid: MY });
const loanedOut = demoPlayer(4, { name: "Emprestado", club_uid: 77, owner: "MFC", owner_uid: MY });
const loanedIn = demoPlayer(5, {
  name: "Chegou de Empréstimo",
  club: "MFC",
  club_uid: MY,
  owner: "Flamengo",
  owner_uid: 9,
});

describe("selection plan", () => {
  const none = () => false;

  it("routes the club's own contracts to a sale and everyone else to a purchase", () => {
    const moves = cartMoves([target, ours, another, loanedOut, loanedIn], MY, none);
    expect(moves.map((m) => [m.kind, m.players.map((p) => p.name)])).toEqual([
      ["buy", ["Alvo", "Outro Alvo", "Chegou de Empréstimo"]],
      ["sell", ["Nosso", "Emprestado"]],
    ]);
  });

  it("offers only the move the selection has", () => {
    expect(cartMoves([target], MY, none).map((m) => m.kind)).toEqual(["buy"]);
    expect(cartMoves([ours], MY, none).map((m) => m.kind)).toEqual(["sell"]);
    expect(cartMoves([], MY, none)).toEqual([]);
    expect(cartMoves([ours], null, none).map((m) => m.kind)).toEqual(["buy"]);
  });

  it("knows who is already in the cart, so the button adds the rest or takes them all out", () => {
    const inCart = (uid: number, kind: string) => uid === target.uid && kind === "buy";
    const [buy] = cartMoves([target, another], MY, inCart);
    expect(buy.missing.map((p) => p.name)).toEqual(["Outro Alvo"]);
    expect(cartMoves([target], MY, inCart)[0].missing).toEqual([]);
  });

  it("blocks a move the cart has no room for, with the reason", () => {
    const moves = cartMoves([target, another], MY, none);
    const [buy] = moves;
    expect(cartBlock(buy, moves, 0)).toBeNull();
    expect(cartBlock(buy, moves, 498)).toBeNull();
    expect(cartBlock(buy, moves, 499)).toBe("O carrinho guarda até 500 itens: cabe só mais 1.");
    const taken = { ...buy, missing: [] };
    expect(cartBlock(taken, [taken], 500)).toBeNull();
  });

  it("counts the room for the buys and the sales of a mixed selection together", () => {
    const moves = cartMoves([target, another, ours, loanedOut], MY, none);
    const [buy, sell] = moves;
    expect(cartBlock(buy, moves, 496)).toBeNull();
    expect(cartBlock(buy, moves, 497)).toBe("O carrinho guarda até 500 itens: cabe só mais 3.");
    expect(cartBlock(sell, moves, 497)).toBe("O carrinho guarda até 500 itens: cabe só mais 3.");
    const sold = cartMoves([target, another, ours, loanedOut], MY, (_, kind) => kind === "sell");
    expect(cartBlock(sold[0], sold, 498)).toBeNull();
    expect(cartBlock(sold[1], sold, 500)).toBeNull();
  });

  it("compares up to three and opens one profile at a time, saying why not otherwise", () => {
    expect(compareBlock(1)).toBeNull();
    expect(compareBlock(3)).toBeNull();
    expect(compareBlock(4)).toBe("Comparar aceita até 3 jogadores: deixe 3 ou menos selecionados.");
    expect(profileBlock(1)).toBeNull();
    expect(profileBlock(2)).toBe("Abre um perfil por vez: deixe só um selecionado.");
  });
});
