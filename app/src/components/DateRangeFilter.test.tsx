import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateRangeFilter } from "./DateRangeFilter";

const values = ["2027-06-30", null, "2029-06-30", "2028-01-31", "2031-06-30"];

function setDate(field: HTMLElement, iso: string) {
  fireEvent.change(field, { target: { value: iso } });
  fireEvent.blur(field);
}

describe("DateRangeFilter", () => {
  it("emits an ISO range clamped to the dates in the column", () => {
    const onChange = vi.fn();
    render(<DateRangeFilter values={values} onChange={onChange} />);
    const from = screen.getByLabelText("De");
    const to = screen.getByLabelText("Até");
    expect(from).toHaveValue("2027-06-30");
    expect(to).toHaveValue("2031-06-30");

    setDate(from, "2020-01-01");
    expect(onChange).toHaveBeenLastCalledWith({ min: "2027-06-30", max: "2031-06-30" });

    setDate(to, "2028-12-31");
    expect(onChange).toHaveBeenLastCalledWith({ min: "2027-06-30", max: "2028-12-31" });
  });

  it("applies a date picked in the calendar without waiting for blur", () => {
    const onChange = vi.fn();
    render(<DateRangeFilter values={values} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2028-12-31" } });
    expect(onChange).toHaveBeenLastCalledWith({ min: "2027-06-30", max: "2028-12-31" });
  });

  it("waits for blur while a date is being typed", () => {
    const onChange = vi.fn();
    render(<DateRangeFilter values={values} onChange={onChange} />);
    const to = screen.getByLabelText("Até");
    fireEvent.input(to, { target: { value: "2029-01-01" }, inputType: "insertText" });
    fireEvent.change(to, { target: { value: "0202-01-01" } });
    fireEvent.keyDown(to, { key: "1" });
    fireEvent.change(to, { target: { value: "2029-01-01" } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.input(to, { target: { value: "2029-01-01" }, inputType: "insertText" });
    fireEvent.blur(to);
    expect(onChange).toHaveBeenLastCalledWith({ min: "2027-06-30", max: "2029-01-01" });
  });

  it("drops typed text when the parent resets the range", () => {
    const { rerender } = render(<DateRangeFilter values={values} max="2030-01-01" onChange={() => {}} />);
    const to = screen.getByLabelText("Até");
    fireEvent.input(to, { target: { value: "2029-01-01" }, inputType: "insertText" });
    expect(to).toHaveValue("2029-01-01");

    rerender(<DateRangeFilter values={values} onChange={() => {}} />);
    expect(to).toHaveValue("2031-06-30");
  });

  it("names its group so two filters can be told apart", () => {
    render(<DateRangeFilter label="Fim do contrato" values={values} onChange={() => {}} />);
    expect(screen.getByRole("group", { name: "Fim do contrato" })).toBeInTheDocument();
  });

  it("offers contract windows counted from the game date", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateRangeFilter values={values} reference="2027-07-14" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Até 6 meses" }));
    expect(onChange).toHaveBeenLastCalledWith({ min: "2027-07-14", max: "2028-01-14" });
  });

  it("says so when the column has no dates", () => {
    render(<DateRangeFilter values={[null, null]} onChange={() => {}} />);
    expect(screen.getByText("Nenhuma data nesta coluna")).toBeInTheDocument();
  });
});
