import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithData, resetApp, startData } from "@/shell/testing";
import { appStore } from "@/store/index";
import { PlayerSearch } from "./PlayerSearch";

describe("PlayerSearch", () => {
  afterEach(resetApp);

  it("takes the focus on Ctrl+K or ⌘K, writes the search, and Esc clears it", async () => {
    const user = userEvent.setup();
    renderWithData(<PlayerSearch searchKey="scout" />, startData().controller);
    const box = screen.getByRole("searchbox", { name: "Buscar nesta lista" });
    await user.keyboard("{Control>}k{/Control}");
    expect(box).toHaveFocus();
    await user.type(box, "Negueba");
    expect(appStore.getState().ui.searches.scout).toBe("Negueba");
    box.blur();
    await user.keyboard("{Meta>}k{/Meta}");
    expect(box).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(appStore.getState().ui.searches.scout).toBe("");
  });

  it("answers the K key in any keyboard layout, and leaves it to an open dialog or menu or a handler that took it", () => {
    renderWithData(<PlayerSearch searchKey="scout" />, startData().controller);
    const box = () => screen.getByRole("searchbox", { name: "Buscar nesta lista" });
    fireEvent.keyDown(document.body, { key: "л", code: "KeyK", ctrlKey: true });
    expect(box()).toHaveFocus();
    box().blur();

    const taken = (e: KeyboardEvent) => e.preventDefault();
    document.body.addEventListener("keydown", taken);
    fireEvent.keyDown(document.body, { key: "k", code: "KeyK", metaKey: true });
    document.body.removeEventListener("keydown", taken);
    expect(box()).not.toHaveFocus();

    for (const role of ["dialog", "menu"]) {
      const overlay = document.body.appendChild(document.createElement("div"));
      overlay.setAttribute("role", role);
      overlay.setAttribute("aria-label", "Aberto");
      fireEvent.keyDown(document.body, { key: "k", code: "KeyK", ctrlKey: true });
      expect(box(), role).not.toHaveFocus();
      overlay.remove();
    }
  });
});
