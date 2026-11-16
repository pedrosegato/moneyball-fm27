import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { type NumberRange, RangeFilter } from "./RangeFilter";

const values = new Float64Array([0.1, 0.25, NaN, 0.4, 0.4, 0.9]);

async function commit(user: ReturnType<typeof userEvent.setup>, field: HTMLElement, text: string) {
  await user.clear(field);
  await user.type(field, `${text}{Enter}`);
}

function DeferredParent({ onApplied }: { onApplied(range: NumberRange): void }) {
  const [range, setRange] = useState<NumberRange>();
  return (
    <RangeFilter
      values={values}
      min={range?.min}
      max={range?.max}
      onChange={(next) =>
        setTimeout(() => {
          setRange(next);
          onApplied(next);
        }, 30)
      }
    />
  );
}

describe("RangeFilter", () => {
  it("emits {min,max} and clamps to data bounds", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RangeFilter values={values} onChange={onChange} />);
    const min = screen.getByRole("textbox", { name: "Mínimo" });
    const max = screen.getByRole("textbox", { name: "Máximo" });
    expect(min).toHaveValue("0,1");
    expect(max).toHaveValue("0,9");

    await commit(user, min, "0,05");
    expect(onChange).toHaveBeenLastCalledWith({ min: 0.1, max: 0.9 });
    expect(min).toHaveValue("0,1");

    await commit(user, max, "5");
    expect(onChange).toHaveBeenLastCalledWith({ min: 0.1, max: 0.9 });

    await commit(user, min, "0,45");
    expect(onChange).toHaveBeenLastCalledWith({ min: 0.45, max: 0.9 });
  });

  it("never lets the minimum pass the maximum", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RangeFilter values={values} max={0.4} onChange={onChange} />);
    await commit(user, screen.getByRole("textbox", { name: "Mínimo" }), "0,8");
    expect(onChange).toHaveBeenLastCalledWith({ min: 0.4, max: 0.4 });
  });

  const all = new Float64Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 45]);
  const pooled = new Float64Array([NaN, NaN, NaN, NaN, NaN, NaN, 6, 7, 8, NaN, 10, NaN]);

  it("draws the bars and the slider over the distribution, while typing and the count cover every value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RangeFilter
        values={all}
        distribution={pooled}
        distributionLabel="dos jogadores com 300+ min"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Mínimo" })).toHaveValue("0");
    expect(screen.getByRole("textbox", { name: "Máximo" })).toHaveValue("45");
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Distribuição de 4 valores dos jogadores com 300+ min entre 6 e 10",
    );
    expect(screen.getByText("12 de 12 no intervalo")).toBeInTheDocument();
    const [minThumb, maxThumb] = screen.getAllByRole("slider", { hidden: true });
    expect(minThumb).toHaveAttribute("min", "6");
    expect(maxThumb).toHaveAttribute("max", "10");

    await commit(user, screen.getByRole("textbox", { name: "Mínimo" }), "2");
    expect(onChange).toHaveBeenLastCalledWith({ min: 2, max: 45 });
  });

  it("reads a thumb left at either end of the distribution as no limit on that side", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RangeFilter values={all} distribution={pooled} onChange={onChange} />);
    const [, maxThumb] = screen.getAllByRole("slider", { hidden: true });
    maxThumb.focus();
    await user.keyboard("{ArrowLeft}");
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ min: 0, max: 9 }));
    await user.keyboard("{End}");
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ min: 0, max: 45 }));
  });

  it("falls back to every value when the distribution has none", () => {
    const all = new Float64Array([0, 5, 10]);
    render(
      <RangeFilter
        values={all}
        distribution={new Float64Array([NaN, NaN, NaN])}
        distributionLabel="dos jogadores com 300+ min"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("img")).toHaveAccessibleName("Distribuição de 3 valores entre 0 e 10");
  });

  it("widens the slider to a saved bound outside the distribution, and moving one thumb keeps the other bound", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const minutes = new Float64Array([0, 100, 300, 500, 900, 2000, 3000, 5400]);
    const spread = minutes.map((v) => (v >= 900 ? v : NaN));
    render(<RangeFilter values={minutes} distribution={spread} max={500} onChange={onChange} />);
    const [minThumb, maxThumb] = screen.getAllByRole("slider", { hidden: true });
    expect(minThumb).toHaveAttribute("min", "0");
    expect(minThumb).toHaveAttribute("aria-valuenow", "0");
    expect(maxThumb).toHaveAttribute("aria-valuenow", "500");

    minThumb.focus();
    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ min: 1, max: 500 }));
  });

  it("shows the current range clamped to the data", () => {
    render(<RangeFilter values={values} min={-3} max={0.25} onChange={() => {}} />);
    expect(screen.getByRole("textbox", { name: "Mínimo" })).toHaveValue("0,1");
    expect(screen.getByRole("textbox", { name: "Máximo" })).toHaveValue("0,25");
  });

  it("flags text that is not a number and emits nothing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RangeFilter values={values} onChange={onChange} />);
    const min = screen.getByRole("textbox", { name: "Mínimo" });
    await commit(user, min, "abc");
    expect(onChange).not.toHaveBeenCalled();
    expect(min).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/Use um número/)).toBeInTheDocument();
  });

  it("draws a 24-bin histogram of the column and counts the rows in range", () => {
    render(<RangeFilter values={values} min={0.3} onChange={() => {}} />);
    expect(screen.getByRole("img", { name: /Distribuição de 5 valores/ })).toBeInTheDocument();
    expect(screen.getByText("3 de 5 no intervalo")).toBeInTheDocument();
  });

  it("keeps the committed range on screen until a deferred parent applies it", async () => {
    const user = userEvent.setup();
    const applied = vi.fn();
    render(<DeferredParent onApplied={applied} />);
    const min = screen.getByRole("textbox", { name: "Mínimo" });
    const [minThumb] = screen.getAllByRole("slider", { hidden: true });

    await commit(user, min, "0,45");
    expect(applied).not.toHaveBeenCalled();
    expect(min).toHaveValue("0,45");
    expect(minThumb).toHaveAttribute("aria-valuenow", "0.45");

    await waitFor(() => expect(applied).toHaveBeenCalledWith({ min: 0.45, max: 0.9 }));
    expect(min).toHaveValue("0,45");
    expect(minThumb).toHaveAttribute("aria-valuenow", "0.45");
  });

  it("drops typed text and its error when the parent resets the range", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RangeFilter values={values} min={0.25} onChange={() => {}} />);
    const min = screen.getByRole("textbox", { name: "Mínimo" });
    await commit(user, min, "abc");
    expect(min).toHaveAttribute("aria-invalid", "true");

    rerender(<RangeFilter values={values} onChange={() => {}} />);
    expect(min).toHaveValue("0,1");
    expect(min).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText(/Use um número/)).not.toBeInTheDocument();
  });

  it("says so when the column has no values", () => {
    render(<RangeFilter values={new Float64Array([NaN])} onChange={() => {}} />);
    expect(screen.getByText("Nenhum valor nesta coluna")).toBeInTheDocument();
  });
});
