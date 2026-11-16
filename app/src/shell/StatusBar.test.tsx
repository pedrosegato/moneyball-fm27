import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { formatClock } from "@/lib/format";
import { appStore } from "@/store/index";
import { fakeSource, testSnapshot } from "@/store/testing";
import { StatusBar } from "./StatusBar";
import { renderWithData, resetApp, startData } from "./testing";

const plate = () => screen.getByRole("group", { name: "Status do jogo" });
const summary = () => within(plate()).getByRole("status", { name: "Leitura do jogo" });
const reload = () => within(plate()).getByRole("button", { name: "Recarregar dados do jogo" });
function visibleText(element: HTMLElement) {
  const copy = element.cloneNode(true) as HTMLElement;
  for (const hidden of copy.querySelectorAll(".sr-only")) hidden.remove();
  return copy.textContent;
}

describe("StatusBar", () => {
  afterEach(() => {
    resetApp();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows only the human club and the save's date once the snapshot is in", async () => {
    const { controller } = startData();
    renderWithData(<StatusBar />, controller);
    await within(plate()).findByText("MFC");
    expect(summary()).toHaveTextContent("MFC 30/10/2026");
    expect(visibleText(plate())).toBe("MFC 30/10/2026");
  });

  it("keeps the build, the game version, the read state and the last read time one hover or focus away", async () => {
    const fake = fakeSource();
    fake.setStatus({
      ok: true,
      build: "6AE8CF77-17969000",
      build_known: true,
      game: "FM27 0.9.2435",
      date: "2026-10-30",
      money: { currency: { code: "EUR", symbol: "€", name: "Euro" }, rate: 1.1641011238098145, wage_period: "month" },
    });
    const { controller } = startData(fake);
    renderWithData(<StatusBar />, controller);
    await within(plate()).findByText("MFC");
    await vi.waitFor(() => expect(summary()).toHaveAccessibleDescription(/FM27 0\.9\.2435/));
    const readAt = appStore.getState().data.readAt!;
    expect(summary()).toHaveAccessibleDescription(
      `Ao vivo. FM27 0.9.2435. Build 6AE8CF77-17969000. Lido às ${formatClock(readAt)}.`,
    );

    await userEvent.hover(summary());
    expect(
      await screen.findByText("Build 6AE8CF77-17969000", { selector: ":not(.sr-only)" }, { timeout: 2000 }),
    ).toBeInTheDocument();
  });

  it("says once in the tooltip that the game's currency was not read and values stay in pounds", async () => {
    const { controller } = startData();
    renderWithData(<StatusBar />, controller);
    await within(plate()).findByText("MFC");
    await vi.waitFor(() => expect(summary()).toHaveAccessibleDescription(/Lido às/));
    const description = summary().getAttribute("aria-describedby")!;
    const text = document.getElementById(description)!.textContent ?? "";
    expect(text.match(/Moeda do jogo não lida: valores em libras\./g)).toHaveLength(1);
    expect(visibleText(plate())).toBe("MFC 30/10/2026");
  });

  it("stale banner appears when game-date event differs from snapshot date", async () => {
    const data = startData();
    renderWithData(<StatusBar />, data.controller);
    await within(plate()).findByText("MFC");
    act(() => data.emitGameDate("2026-11-02"));
    const strip = within(plate()).getByRole("status", { name: "Aviso" });
    expect(strip).toHaveTextContent("Dados de 30/10, jogo em 02/11: atualizar");

    await userEvent.click(within(strip).getByRole("button", { name: "atualizar" }));
    expect(data.source.loadPlayers).toHaveBeenCalledTimes(2);
  });

  it("error status shows banner and keeps previous data", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const data = startData();
    renderWithData(<StatusBar />, data.controller);
    await within(plate()).findByText("MFC");
    const { snapshot, analysis } = appStore.getState().data;

    data.setStatus({ ok: false, error: "Processo do FM27 não encontrado" });
    await act(() => vi.advanceTimersByTimeAsync(5_000));

    const alert = within(plate()).getByRole("alert");
    expect(alert).toHaveTextContent("Jogo não encontrado");
    expect(alert).toHaveAccessibleDescription(/Processo do FM27 não encontrado/);
    expect(summary()).toHaveTextContent("MFC 30/10/2026");
    expect(appStore.getState().data.snapshot).toBe(snapshot);
    expect(appStore.getState().data.analysis).toBe(analysis);
  });

  it("reads a busy status as the game being read, never as closed, and keeps the club and date", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const data = startData();
    renderWithData(<StatusBar />, data.controller);
    await within(plate()).findByText("MFC");

    data.setStatus({ ok: false, busy: true });
    await act(() => vi.advanceTimersByTimeAsync(5_000));

    expect(summary()).toHaveTextContent("MFC");
    expect(summary()).not.toHaveTextContent("Lendo");
    expect(within(plate()).queryByRole("alert")).toBeNull();
  });

  it("warns when the reader does not know the game's build, and names the build", async () => {
    const fake = fakeSource();
    fake.setStatus({ ok: true, build: "6B000000-00000000", build_known: false, date: "2026-10-30" });
    const { controller } = startData(fake);
    renderWithData(<StatusBar />, controller);
    await within(plate()).findByText("MFC");
    expect(within(plate()).getByRole("alert")).toHaveTextContent("Versão do jogo não reconhecida");
    expect(summary()).toHaveAccessibleDescription(/Build 6B000000-00000000/);
  });

  it("reads a game the reader cannot read as an unsupported version, never as a closed game", async () => {
    const fake = fakeSource();
    const error = "O leitor não consegue ler esta versão do jogo. Aguarde uma atualização do app.";
    fake.setStatus({ ok: false, build: "6B000000-1", build_known: false, error });
    const { controller } = startData(fake);
    renderWithData(<StatusBar />, controller);
    await vi.waitFor(() =>
      expect(within(plate()).getByRole("alert")).toHaveTextContent("Versão do jogo não reconhecida"),
    );
    expect(within(plate()).getByRole("alert")).toHaveAccessibleDescription(error);
    expect(summary()).toHaveAccessibleDescription(/Build 6B000000-1/);
  });

  it("names the club the models and the budget use: the first human club with a uid", async () => {
    const fake = fakeSource(
      testSnapshot({
        my_clubs: [
          { name: "Sem uid", uid: null },
          { name: "MFC", uid: 301344 },
        ],
      }),
    );
    const { controller } = startData(fake);
    renderWithData(<StatusBar />, controller);
    await within(plate()).findByText("MFC");
    expect(within(plate()).queryByText("Sem uid")).toBeNull();
  });

  it("shows no loading text or spinning icon in the header while the players load", async () => {
    const fake = fakeSource();
    fake.source.loadPlayers.mockImplementation((_scope, _rescan, onProgress) => {
      onProgress?.({ phase: "read", done: 22_000, total: 44_000 });
      return new Promise(() => {});
    });
    const { controller } = startData(fake);
    renderWithData(<StatusBar />, controller);
    await vi.waitFor(() => expect(reload()).toHaveAttribute("aria-disabled", "true"));
    expect(summary()).not.toHaveTextContent("Lendo");
    expect(reload().querySelector("svg")).not.toHaveClass("animate-spin");
  });

  it("shows a failed load, with the reason one focus away, while keeping the data", async () => {
    const data = startData();
    renderWithData(<StatusBar />, data.controller);
    await within(plate()).findByText("MFC");
    data.source.loadPlayers.mockRejectedValueOnce("FM27 não está aberto");
    await act(() => data.controller.reload());
    const alert = within(plate()).getByRole("alert");
    expect(alert).toHaveTextContent("Falha ao ler o jogo");
    expect(alert).toHaveAccessibleDescription(/FM27 não está aberto/);
    expect(summary()).toHaveTextContent("MFC 30/10/2026");
  });

  it("keeps the refresh button focusable but inert while a load runs", async () => {
    const fake = fakeSource();
    fake.source.loadPlayers.mockImplementation(() => new Promise(() => {}));
    const { controller } = startData(fake);
    renderWithData(<StatusBar />, controller);
    const button = reload();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toBeEnabled();
    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(button).toHaveFocus();
    expect(fake.source.loadPlayers).toHaveBeenCalledTimes(1);
  });

  it("the refresh button reads the players again", async () => {
    const data = startData();
    renderWithData(<StatusBar />, data.controller);
    await within(plate()).findByText("MFC");
    expect(reload().querySelector("svg")).not.toHaveClass("animate-spin");
    await userEvent.click(reload());
    expect(data.source.loadPlayers).toHaveBeenCalledTimes(2);
  });
});
