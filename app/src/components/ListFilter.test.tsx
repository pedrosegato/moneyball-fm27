import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListFilter } from "./ListFilter";

const options = [
  { value: "bra-a", label: "Brasileirão Série A", count: 540 },
  { value: "bra-b", label: "Brasileirão Série B", count: 480 },
  { value: "arg", label: "Liga Profesional Argentina", count: 510 },
  { value: "sp", label: "Campeonato Paulista", count: 12 },
];

describe("ListFilter", () => {
  it("search narrows options", async () => {
    const user = userEvent.setup();
    render(<ListFilter options={options} selected={[]} onChange={() => {}} />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);

    await user.type(screen.getByRole("searchbox", { name: "Buscar" }), "série");
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(screen.queryByText("Liga Profesional Argentina")).not.toBeInTheDocument();
  });

  it("ignores accents and case", async () => {
    const user = userEvent.setup();
    render(<ListFilter options={options} selected={[]} onChange={() => {}} />);
    await user.type(screen.getByRole("searchbox", { name: "Buscar" }), "SERIE b");
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    expect(screen.getByRole("checkbox", { name: /Brasileirão Série B/ })).toBeInTheDocument();
  });

  it("selecionar visíveis adds the matching options to the selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ListFilter options={options} selected={["arg"]} onChange={onChange} />);
    await user.type(screen.getByRole("searchbox", { name: "Buscar" }), "série");
    await user.click(screen.getByRole("button", { name: /Selecionar visíveis/ }));
    expect(onChange).toHaveBeenLastCalledWith(["arg", "bra-a", "bra-b"]);
  });

  it("toggles one option and clears all", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ListFilter options={options} selected={["arg", "sp"]} onChange={onChange} />);
    expect(screen.getByRole("checkbox", { name: /Liga Profesional Argentina/ })).toBeChecked();

    await user.click(screen.getByRole("checkbox", { name: /Campeonato Paulista/ }));
    expect(onChange).toHaveBeenLastCalledWith(["arg"]);

    await user.click(screen.getByRole("checkbox", { name: /Brasileirão Série A/ }));
    expect(onChange).toHaveBeenLastCalledWith(["arg", "sp", "bra-a"]);

    await user.click(screen.getByRole("button", { name: "Limpar" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("tells when the search finds nothing", async () => {
    const user = userEvent.setup();
    render(<ListFilter options={options} selected={[]} onChange={() => {}} />);
    await user.type(screen.getByRole("searchbox", { name: "Buscar" }), "zzz");
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getByText("Nada encontrado para “zzz”")).toBeInTheDocument();
  });

  it("makes the scrolling list a named group reached through its checkboxes", () => {
    render(<ListFilter label="Ligas" options={options} selected={[]} onChange={() => {}} />);
    const list = screen.getByRole("group", { name: "Ligas" });
    expect(list).not.toHaveAttribute("tabindex");
    expect(within(list).getAllByRole("checkbox")).toHaveLength(options.length);
    expect((list.firstElementChild as HTMLElement).style.maxHeight).toBe("240px");
  });

  it("renders only a window of a long list", () => {
    const many = Array.from({ length: 5000 }, (_, i) => ({ value: String(i), label: `Clube ${i}` }));
    render(<ListFilter options={many} selected={[]} onChange={() => {}} />);
    expect(screen.getAllByRole("checkbox").length).toBeLessThan(40);
  });

  it("keeps the focused option mounted, and focused, when the list scrolls it out of its window", () => {
    const many = Array.from({ length: 5000 }, (_, i) => ({ value: String(i), label: `Clube ${i}` }));
    render(<ListFilter label="Clubes" options={many} selected={[]} onChange={() => {}} />);
    const first = screen.getByRole("checkbox", { name: "Clube 0" });
    act(() => first.focus());
    const scroller = screen.getByRole("group", { name: "Clubes" }).firstElementChild as HTMLElement;
    act(() => {
      scroller.scrollTop = 28 * 2000;
      scroller.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByRole("checkbox", { name: "Clube 2000" })).toBeInTheDocument();
    expect(first).toBeInTheDocument();
    expect(first).toHaveFocus();
    expect(screen.queryByRole("checkbox", { name: "Clube 1" })).toBeNull();
  });
});
