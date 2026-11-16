import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithData, resetApp, startData } from "@/shell/testing";
import { appStore } from "@/store/index";
import { RolePicker } from "./RolePicker";

describe("RolePicker", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => {};
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });
  afterEach(resetApp);

  it("picking Central Pragmático sets the role and names it on the button", async () => {
    const user = userEvent.setup();
    renderWithData(<RolePicker />, startData().controller);
    await user.click(screen.getByRole("button", { name: "Função da coluna Performance: Melhor função" }));
    await user.type(screen.getByRole("combobox"), "Pragm");
    await user.click(await screen.findByRole("option", { name: /Central Pragmático/ }));
    expect(appStore.getState().ui.role).toBe("ip:29");
    expect(screen.getByRole("button", { name: "Função da coluna Performance: Central Pragmático" })).toBeVisible();
  });

  it("Melhor função clears the role", async () => {
    const user = userEvent.setup();
    appStore.getState().setRole("ip:29");
    renderWithData(<RolePicker />, startData().controller);
    await user.click(screen.getByRole("button", { name: "Função da coluna Performance: Central Pragmático" }));
    await user.click(await screen.findByRole("option", { name: "Melhor função" }));
    expect(appStore.getState().ui.role).toBeNull();
  });

  it("names the phase on the button for a Sem bola role and sets a tooltip", async () => {
    appStore.getState().setRole("oop:3");
    renderWithData(<RolePicker />, startData().controller);
    const button = screen.getByRole("button", {
      name: "Função da coluna Performance: Defesa Central (Sem bola)",
    });
    expect(button).toHaveAttribute("title", "Defesa Central (Sem bola)");
  });

  it("keyboard can pick the Sem bola twin of a role", async () => {
    const user = userEvent.setup();
    renderWithData(<RolePicker />, startData().controller);
    await user.click(screen.getByRole("button", { name: /^Função da coluna Performance/ }));
    await user.type(screen.getByRole("combobox"), "Defesa Central");
    const options = await screen.findAllByRole("option", { name: /^Defesa Central/ });
    expect(options.filter((o) => o.getAttribute("aria-selected") === "true")).toHaveLength(1);
    await user.type(screen.getByRole("combobox"), " sem bola{Enter}");
    expect(appStore.getState().ui.role).toBe("oop:3");
  });
});
