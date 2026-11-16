import { playerRecord } from "@/engine/testing/records";
import { ratings } from "@/table/fixtures";
import { listOptions } from "./listOptions";

describe("listOptions", () => {
  const players = [
    playerRecord({ club: "Viking", foot: "Left", pos: ratings("ST", { AMR: 18 }) }),
    playerRecord({ club: "Viking", foot: "Right", pos: ratings("DC") }),
    playerRecord({ club: null, foot: "Right", pos: ratings("ST") }),
  ];

  it("counts each value, the biggest first, with the empty one named", () => {
    expect(listOptions(players, "club")).toEqual([
      { value: "Viking", label: "Viking", count: 2 },
      { value: "", label: "Sem clube", count: 1 },
    ]);
    expect(listOptions(players, "foot")).toEqual([
      { value: "Right", label: "Direito", count: 2 },
      { value: "Left", label: "Esquerdo", count: 1 },
    ]);
  });

  it("lists natural positions back to front, as the game does", () => {
    expect(listOptions(players, "naturalPositions")).toEqual([
      { value: "DC", label: "DC", count: 1 },
      { value: "AMR", label: "AMR", count: 1 },
      { value: "ST", label: "ST", count: 2 },
    ]);
  });
});
