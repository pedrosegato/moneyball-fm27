import { expect, test } from "@playwright/test";

test("shell renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Barra lateral" })).toBeVisible();
});
