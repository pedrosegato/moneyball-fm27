import { expect, type Page, test } from "@playwright/test";

const LOADED = { timeout: 60_000 };
const ROLE = "Central Pragmático";

test.use({ viewport: { width: 1920, height: 1080 } });

const table = (page: Page) => page.getByRole("table", { name: "Jogadores" });
const status = (page: Page) => page.getByRole("region", { name: "Tabela de jogadores" }).getByRole("status");
const header = (page: Page) => table(page).locator('thead [data-column-id="perf"]');
const rolePicker = (page: Page) => page.getByRole("button", { name: /^Função da coluna Performance/ });
const cells = (page: Page) => table(page).locator('tbody tr[data-player] td[data-column-id="perf"]');
const roleCells = (page: Page) => table(page).locator('tbody tr[data-player] td[data-column-id="perfRole"]');

async function open(page: Page) {
  await page.goto("/#/scout");
  await expect(table(page).locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
  await expect(header(page)).toBeVisible();
}

async function chipTexts(page: Page): Promise<string[]> {
  await expect(cells(page).first()).toBeVisible();
  return cells(page).evaluateAll((tds) =>
    tds.map((td) => td.querySelector('[aria-hidden="true"]')?.textContent?.trim() ?? ""),
  );
}

async function shownCount(page: Page): Promise<number> {
  const text = (await status(page).textContent()) ?? "";
  return Number(/^[\d.]+/.exec(text)?.[0].replaceAll(".", ""));
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("roles-spec-cleared")) {
      localStorage.clear();
      sessionStorage.setItem("roles-spec-cleared", "1");
    }
  });
});

test("Scout shows Performance as a number, with the best role in the Função column beside it", async ({ page }) => {
  await open(page);
  const texts = await chipTexts(page);
  expect(texts.some((t) => /^\d+$/.test(t))).toBe(true);
  expect(texts.every((t) => !t.includes("·"))).toBe(true);
  const roles = await roleCells(page).allTextContents();
  expect(roles.some((t) => t.trim().length > 2)).toBe(true);
});

test("picking a role relabels the column and survives a reload", async ({ page }) => {
  await open(page);
  await rolePicker(page).click();
  await page.getByRole("combobox", { name: "Buscar função" }).fill("Pragm");
  await page
    .getByRole("option", { name: new RegExp(ROLE) })
    .first()
    .click();
  await expect(rolePicker(page)).toContainText(ROLE);
  await expect
    .poll(async () => {
      const texts = await chipTexts(page);
      const roles = await roleCells(page).allTextContents();
      return texts.some((t) => /^\d+$/.test(t)) && roles.every((t) => t.trim() === "" || t.trim() === ROLE);
    })
    .toBe(true);

  await page.reload();
  await expect(table(page).locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
  await expect(rolePicker(page)).toContainText(ROLE);
});

test("a filter on Performance narrows the list", async ({ page }) => {
  await open(page);
  const before = await shownCount(page);
  await header(page).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Filtrar…" }).click();
  const editor = page.getByRole("dialog");
  await expect(editor).toBeVisible();
  const min = editor.getByRole("textbox", { name: "Mínimo" });
  await min.fill("70");
  await min.press("Enter");
  await page.keyboard.press("Escape");

  await expect.poll(() => shownCount(page)).toBeLessThan(before);
  const values = (await chipTexts(page)).map((t) => Number(/^\d+/.exec(t)?.[0]));
  expect(values.length).toBeGreaterThan(0);
  for (const v of values) expect(v).toBeGreaterThanOrEqual(70);
});

test("the player sheet lists Funções", async ({ page }) => {
  await open(page);
  await table(page).locator("tbody tr[data-player]").first().click();
  const section = page.getByRole("region", { name: "Funções" });
  await expect(section).toBeVisible();
  await expect(section).toContainText("Com bola");
  await expect(section).toContainText("Sem bola");
});
