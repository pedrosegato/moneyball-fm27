import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithData, resetApp, startData } from "@/shell/testing";
import { appStore } from "@/store/index";
import { fakeEngine, fakeSource } from "@/store/testing";
import { useData } from "@/store/useData";
import { PeriodFilter } from "./PeriodFilter";

function ShownMinutes() {
  const { snapshot } = useData();
  return <output aria-label="minutos">{snapshot?.players[0]?.season?.minutes ?? 0}</output>;
}

async function started() {
  const engine = fakeEngine();
  const { controller } = startData(fakeSource(), () => engine.client);
  renderWithData(
    <>
      <PeriodFilter />
      <ShownMinutes />
    </>,
    controller,
  );
  await vi.waitFor(() => expect(engine.calls).toHaveLength(1));
  engine.calls[0].resolve();
  await vi.waitFor(() => expect(appStore.getState().data.analysis).not.toBeNull());
  return engine;
}

describe("PeriodFilter", () => {
  afterEach(resetApp);

  it("marks the button busy while the new period is calculated and clears it when the analysis arrives", async () => {
    const user = userEvent.setup();
    const engine = await started();
    const trigger = screen.getByRole("button", { name: /^Período: Esta temporada/ });
    expect(trigger).not.toHaveAttribute("aria-busy", "true");
    await user.click(trigger);
    await user.click(await screen.findByRole("menuitemradio", { name: "Últimos 30 jogos" }));
    const switching = screen.getByRole("button", { name: /^Período: Últimos 30 jogos/ });
    expect(switching).toHaveAttribute("aria-busy", "true");
    await vi.waitFor(() => expect(engine.calls).toHaveLength(2));
    engine.calls[1].resolve();
    await vi.waitFor(() => expect(switching).toHaveAttribute("aria-busy", "false"));
  });

  it("keeps the shown numbers on the old period until the analysis for the new one arrives", async () => {
    const engine = await started();
    const minutes = screen.getByRole("status", { name: "minutos" });
    const before = minutes.textContent;
    expect(Number(before)).toBeGreaterThan(0);
    appStore.getState().setPeriod("year:2025");
    await vi.waitFor(() => expect(engine.calls).toHaveLength(2));
    expect(minutes).toHaveTextContent(before ?? "");
    engine.calls[1].resolve();
    await vi.waitFor(() => expect(minutes).toHaveTextContent("0"));
  });
});
