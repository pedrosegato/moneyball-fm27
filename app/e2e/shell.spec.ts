import { expect, test } from "@playwright/test";

const LOADED = { timeout: 60_000 };

test("loads snapshot and shows the club and the save's date, the build kept for the tooltip", async ({ page }) => {
  await page.goto("/");
  const plate = page.getByRole("group", { name: "Status do jogo" });
  await expect(plate).toContainText("MFC", LOADED);
  const summary = plate.getByRole("status", { name: "Leitura do jogo" });
  await expect(summary).toHaveText(/^MFC \d{2}\/\d{2}\/\d{4}$/);
  await expect(summary).toHaveAccessibleDescription(/Ao vivo\. Build [0-9A-F]{8}-[0-9A-F]{8}\. Lido às \d{2}:\d{2}\./);
  await expect(plate.getByRole("button", { name: "Recarregar dados do jogo" })).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "Carrinho" })).toHaveAttribute("href", "#/carrinho");
  await expect(page.getByRole("table", { name: "Jogadores" })).toBeVisible();
});

test("the sidebar collapses to its icons from the header toggle, keeps the mark, and stays collapsed after a reload", async ({
  page,
}) => {
  await page.goto("/");
  const rail = page.getByRole("complementary", { name: "Barra lateral" });
  const toggle = page.getByRole("button", { name: "Barra lateral" });
  const open = (await rail.boundingBox())!.width;
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(rail).toHaveAttribute("data-collapsed", "true");
  await expect.poll(async () => (await rail.boundingBox())!.width).toBeLessThan(open / 3);
  await expect(toggle).toBeFocused();

  await rail.getByRole("link", { name: "Elenco" }).hover();
  await expect(page.locator('[data-slot="tooltip-content"]', { hasText: "Elenco" })).toBeVisible();
  await rail.getByRole("link", { name: "Elenco" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Elenco");
  await expect(rail.getByRole("link", { name: "Scout" })).toHaveAttribute("href", "#/scout");
  await expect(rail.getByText("27", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("complementary", { name: "Barra lateral" })).toHaveAttribute("data-collapsed", "true");
  await page.getByRole("button", { name: "Barra lateral" }).click();
  await expect(page.getByRole("region", { name: "Verba da janela" })).toBeVisible();
});

test("Shortlist in the rail and the cart in the header open the two halves of the Carrinho page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Shortlist" }).click();
  await expect(page).toHaveURL(/#\/carrinho$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Shortlist");
  await page.getByRole("banner").getByRole("link", { name: "Carrinho" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Carrinho");
});

test("sidebar links switch pages through the hash", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Scout");
  await page.getByRole("link", { name: "Elenco" }).click();
  await expect(page).toHaveURL(/#\/elenco$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Elenco");
  await expect(page.getByRole("link", { name: "Elenco" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Configurações" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Configurações");
});

test("a saved theme comes back after a reload, past an invalid neighbour", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("moneyball-fm27:v1:settings", JSON.stringify({ theme: "light", pollSeconds: 1 })),
  );
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});
