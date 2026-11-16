import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SegmentedControl } from "./SegmentedControl";
import { SegmentedControlItem } from "./SegmentedControlItem";

function Display({ onValueChange }: { onValueChange: (v: string) => void }) {
  const [value, setValue] = useState("valor");
  return (
    <SegmentedControl
      aria-label="Exibição"
      value={value}
      onValueChange={(v) => {
        onValueChange(v);
        setValue(v);
      }}
    >
      <SegmentedControlItem value="valor">Valor</SegmentedControlItem>
      <SegmentedControlItem value="percentil">Percentil</SegmentedControlItem>
    </SegmentedControl>
  );
}

describe("SegmentedControl", () => {
  it("is a radio group whose choice can change but never empty", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Display onValueChange={onValueChange} />);
    expect(screen.getByRole("radiogroup", { name: "Exibição" })).toBeInTheDocument();
    const valor = screen.getByRole("radio", { name: "Valor" });
    const percentil = screen.getByRole("radio", { name: "Percentil" });
    expect(valor).toBeChecked();

    await user.click(valor);
    expect(valor).toBeChecked();
    expect(onValueChange).not.toHaveBeenCalled();

    await user.click(percentil);
    expect(onValueChange).toHaveBeenLastCalledWith("percentil");
    expect(percentil).toBeChecked();
    expect(valor).not.toBeChecked();
  });

  it("moves the choice with the arrow keys", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Display onValueChange={onValueChange} />);
    await user.click(screen.getByRole("radio", { name: "Valor" }));
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith("percentil");
    expect(screen.getByRole("radio", { name: "Percentil" })).toBeChecked();
  });
});
