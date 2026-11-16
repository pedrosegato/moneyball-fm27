import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { useDraftInput } from "./useDraftInput";

function Field({ discardInvalidOnBlur }: { discardInvalidOnBlur?: boolean }) {
  const [value, setValue] = useState(10);
  const { invalid, inputProps } = useDraftInput({
    shown: String(value),
    discardInvalidOnBlur,
    accept: (text) => {
      const next = Number(text);
      if (!Number.isInteger(next)) return false;
      setValue(next);
      return true;
    },
  });
  return (
    <>
      <input aria-label="Campo" aria-invalid={invalid || undefined} {...inputProps} />
      <output aria-label="Valor">{value}</output>
    </>
  );
}

describe("useDraftInput", () => {
  it("commits the typed text on Enter and shows the committed value again", async () => {
    render(<Field />);
    const input = screen.getByRole("textbox", { name: "Campo" });
    await userEvent.clear(input);
    await userEvent.type(input, "42{Enter}");
    expect(screen.getByLabelText("Valor")).toHaveTextContent("42");
    expect(input).toHaveValue("42");
  });

  it("drops the draft on Escape", async () => {
    render(<Field />);
    const input = screen.getByRole("textbox", { name: "Campo" });
    await userEvent.type(input, "5{Escape}");
    expect(input).toHaveValue("10");
    expect(screen.getByLabelText("Valor")).toHaveTextContent("10");
  });

  it("keeps text it cannot accept and marks it invalid, until the next keystroke", async () => {
    render(<Field />);
    const input = screen.getByRole("textbox", { name: "Campo" });
    await userEvent.type(input, "x{Enter}");
    expect(input).toHaveValue("10x");
    expect(input).toHaveAttribute("aria-invalid", "true");
    await userEvent.type(input, "{Backspace}");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("can throw away invalid text when the field loses focus", async () => {
    render(<Field discardInvalidOnBlur />);
    const input = screen.getByRole("textbox", { name: "Campo" });
    await userEvent.type(input, "x");
    await userEvent.tab();
    expect(input).toHaveValue("10");
    expect(input).not.toHaveAttribute("aria-invalid");
  });
});
