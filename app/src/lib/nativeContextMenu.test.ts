import { fireEvent } from "@testing-library/react";
import { blockNativeContextMenu } from "./nativeContextMenu";

describe("blockNativeContextMenu", () => {
  it("keeps the webview's menu off the app and on text fields only", () => {
    const cell = document.body.appendChild(document.createElement("div"));
    const field = document.body.appendChild(document.createElement("input"));
    const stop = blockNativeContextMenu();
    try {
      expect(fireEvent.contextMenu(cell)).toBe(false);
      expect(fireEvent.contextMenu(field)).toBe(true);
    } finally {
      stop();
      cell.remove();
      field.remove();
    }
    expect(fireEvent.contextMenu(document.body)).toBe(true);
  });
});
