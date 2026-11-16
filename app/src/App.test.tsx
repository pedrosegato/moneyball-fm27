import { act, screen } from "@testing-library/react";
import { renderWithData, resetApp, startData } from "@/shell/testing";
import { appStore } from "@/store/index";
import { App } from "./App";

describe("App", () => {
  afterEach(() => {
    resetApp();
    document.documentElement.classList.add("dark");
  });

  it("renders the shell", () => {
    renderWithData(<App />, startData().controller);
    expect(screen.getByRole("complementary", { name: "Barra lateral" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("shows a store notice once, as a toast", async () => {
    renderWithData(<App />, startData().controller);
    act(() => appStore.getState().showNotice("Não foi possível abrir as configurações salvas; usando padrões"));
    expect(
      await screen.findByText("Não foi possível abrir as configurações salvas; usando padrões"),
    ).toBeInTheDocument();
    expect(appStore.getState().ui.notice).toBeNull();
  });

  it("leaves the theme on the page alone when it mounts", () => {
    document.documentElement.classList.remove("dark");
    renderWithData(<App />, startData().controller);
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
