import { fireEvent } from "@testing-library/react";
import { trackLastInput } from "./lastInput";

describe("trackLastInput", () => {
  it("marks the root with the input the user touched last, which the motion rules read", () => {
    const root = document.createElement("div");
    const stop = trackLastInput(root);
    try {
      expect(root.dataset.input).toBe("pointer");
      fireEvent.keyDown(document.body, { key: "Enter" });
      expect(root.dataset.input).toBe("keyboard");
      fireEvent.pointerMove(document.body);
      expect(root.dataset.input).toBe("pointer");
      fireEvent.keyDown(document.body, { key: "Escape" });
      fireEvent.pointerDown(document.body);
      expect(root.dataset.input).toBe("pointer");
    } finally {
      stop();
    }
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(root.dataset.input).toBe("pointer");
  });
});
