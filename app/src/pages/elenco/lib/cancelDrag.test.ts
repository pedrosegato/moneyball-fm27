import { cancelLiveDrag } from "./cancelDrag";

describe("cancelLiveDrag", () => {
  it("sends the Escape that cancels a dnd-kit drag, already handled so no other Escape handler acts on it", () => {
    const seen: string[] = [];
    const listener = (event: KeyboardEvent) => seen.push(`${event.code}:${event.defaultPrevented}`);
    document.addEventListener("keydown", listener);
    cancelLiveDrag();
    document.removeEventListener("keydown", listener);
    expect(seen).toEqual(["Escape:true"]);
  });

  it("leaves later Escape presses alone", () => {
    cancelLiveDrag();
    expect(fireEscape()).toBe(true);
  });
});

function fireEscape() {
  return document.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape", key: "Escape", cancelable: true }));
}
