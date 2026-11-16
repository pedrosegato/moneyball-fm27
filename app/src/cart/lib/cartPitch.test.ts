import { playerRecord, snapshotOf } from "@/engine/testing/records";
import { item, MY, posWith } from "../testing/cartItems";
import { cartPitch } from "./cartPitch";
import { reconcileCart } from "./reconcile";

describe("cartPitch", () => {
  it("counts the buys in every natural position and lists their names", () => {
    const zagueiro = playerRecord({ name: "Zé", pos: posWith({ DC: 20, DM: 18, DR: 16 }) });
    const ponta = playerRecord({ name: "Léo", pos: posWith({ AMR: 19 }) });
    const garoto = playerRecord({ name: "Kauã", pos: posWith({ ST: 14, AMC: 12 }) });
    const vendido = playerRecord({ name: "Saída", pos: posWith({ DC: 20 }) });
    const snapshot = snapshotOf([zagueiro, ponta, garoto, vendido]);
    const lines = reconcileCart(
      [
        item(zagueiro.uid, "buy"),
        item(ponta.uid, "buy"),
        item(garoto.uid, "buy"),
        item(vendido.uid, "sell"),
        item(31337, "buy"),
      ],
      snapshot,
      MY,
    );
    const pitch = cartPitch(lines, snapshot.players);
    expect(pitch.counts).toEqual({ DC: 1, DM: 1, AMR: 1, ST: 1 });
    expect(pitch.names).toEqual({ DC: ["Zé"], DM: ["Zé"], AMR: ["Léo"], ST: ["Kauã"] });
    expect(pitch.arrivals).toBe(3);
  });
});
