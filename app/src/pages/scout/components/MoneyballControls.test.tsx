import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { appStore } from "@/store/index";
import { MoneyballControls } from "./MoneyballControls";

const criteria = () => appStore.getState().settings.engine.moneyball;
const field = (name: RegExp) => screen.getByRole("textbox", { name });

describe("MoneyballControls", () => {
  afterEach(() => appStore.setState(appStore.getInitialState(), true));

  it("refuses a ratio or a fair value no save could reach, and Esc puts the saved value back", async () => {
    const user = userEvent.setup();
    render(<MoneyballControls />);
    const ratio = field(/^Razão mínima/);
    const fair = field(/^Valor justo mínimo/);

    for (const [input, text] of [
      [ratio, "5000"],
      [fair, "1.001"],
      [fair, "Infinity"],
      [ratio, "-1"],
    ] as const) {
      await user.clear(input);
      await user.type(input, `${text}{Enter}`);
      expect(input, text).toHaveAttribute("aria-invalid", "true");
      await user.keyboard("{Escape}");
      expect(input).not.toHaveAttribute("aria-invalid");
    }
    expect(ratio).toHaveValue("2");
    expect(fair).toHaveValue("0,25");
    expect(criteria()).toMatchObject({ minRatio: 2, minFair: 250_000 });

    await user.clear(ratio);
    await user.type(ratio, "1000{Enter}");
    await user.clear(fair);
    await user.type(fair, "1.000{Enter}");
    expect(criteria()).toMatchObject({ minRatio: 1000, minFair: 1_000_000_000 });
  });

  it("keeps both thresholds when two fields commit before the controls render again", () => {
    render(<MoneyballControls />);
    const ratio = field(/^Razão mínima/);
    const perf = field(/^Performance mínima/);
    fireEvent.change(ratio, { target: { value: "3" } });
    fireEvent.change(perf, { target: { value: "70" } });
    act(() => {
      fireEvent.blur(ratio);
      fireEvent.keyDown(perf, { key: "Enter" });
    });
    expect(criteria()).toMatchObject({ minRatio: 3, minPerf: 70 });
  });
});
