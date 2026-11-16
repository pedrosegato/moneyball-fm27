import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { appStore } from "@/store/index";
import { CartButton } from "./CartButton";
import { resetApp } from "./testing";

const renderButton = (current = false) =>
  render(
    <TooltipProvider>
      <CartButton current={current} />
    </TooltipProvider>,
  );

describe("CartButton", () => {
  afterEach(resetApp);

  it("is a plain cart icon while the cart is empty", () => {
    renderButton();
    const cart = screen.getByRole("link", { name: "Carrinho" });
    expect(cart).toHaveAttribute("href", "#/carrinho");
    expect(cart).toHaveTextContent("");
  });

  it("counts the moves in the cart on a badge, like a shop", () => {
    appStore.getState().addToCart({ uid: 1, kind: "buy", fee: 1, wage: 1, name: "A" });
    appStore.getState().addToCart({ uid: 2, kind: "sell", fee: 1, wage: 1, name: "B" });
    renderButton();
    expect(screen.getByRole("link", { name: "Carrinho, 2 itens" })).toHaveTextContent("2");
    act(() => appStore.getState().removeFromCart(2, "sell"));
    expect(screen.getByRole("link", { name: "Carrinho, 1 item" })).toHaveTextContent("1");
  });

  it("opens the cart half of the page, even from the Shortlist", async () => {
    appStore.getState().setCartView("shortlist");
    renderButton();
    await userEvent.click(screen.getByRole("link", { name: "Carrinho" }));
    expect(appStore.getState().ui.cartView).toBe("carrinho");
    expect(window.location.hash).toBe("#/carrinho");
  });

  it("marks itself as the current page on the cart", () => {
    renderButton(true);
    expect(screen.getByRole("link", { name: "Carrinho" })).toHaveAttribute("aria-current", "page");
  });
});
