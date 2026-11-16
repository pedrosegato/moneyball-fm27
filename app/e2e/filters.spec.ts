import { expect, type Locator, type Page, test } from "@playwright/test";

const LOADED = { timeout: 60_000 };
const SERIE_B = "Brasileirão Serie B Chevrolet";

interface ServedPlayer {
  age: number | null;
  division: string | null;
  season: { minutes: number } | null;
}

let served: ServedPlayer[] | null = null;

async function servedPlayers(page: Page): Promise<ServedPlayer[]> {
  served ??= (await (await page.request.get("/__dev/snapshot")).json()).players as ServedPlayer[];
  return served;
}

const count = (n: number) => n.toLocaleString("pt-BR");

async function open(page: Page) {
  await page.goto("/");
  await expect(table(page).locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
}

const table = (page: Page) => page.getByRole("table", { name: "Jogadores" });
const status = (page: Page) => page.getByRole("region", { name: "Tabela de jogadores" }).getByRole("status");
const filterBar = (page: Page) => page.getByRole("group", { name: "Filtros ativos" });
const header = (page: Page, columnId: string) => table(page).locator(`thead [data-column-id="${columnId}"]`);

async function closeEditor(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function reveal(page: Page, columnId: string) {
  if (await header(page, columnId).count()) return;
  await table(page).evaluate((t) => (t.parentElement!.scrollLeft = t.parentElement!.scrollWidth));
  await expect(header(page, columnId)).toBeAttached();
}

async function filterFromHeader(page: Page, columnId: string): Promise<Locator> {
  await reveal(page, columnId);
  await header(page, columnId).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Filtrar…" }).click();
  const editor = page.getByRole("dialog");
  await expect(editor).toBeVisible();
  return editor;
}

async function typeBound(editor: Locator, side: "Mínimo" | "Máximo", text: string) {
  const field = editor.getByRole("textbox", { name: side });
  await field.fill(text);
  await field.press("Enter");
}

test("right-click Mins → 900–3000 shows exactly engine count", async ({ page }) => {
  const players = await servedPlayers(page);
  const expected = players.filter((p) => {
    const minutes = p.season?.minutes ?? 0;
    return minutes >= 900 && minutes <= 3000;
  }).length;
  await open(page);

  const editor = await filterFromHeader(page, "minutes");
  await typeBound(editor, "Mínimo", "900");
  await typeBound(editor, "Máximo", "3000");
  await closeEditor(page);

  await expect(filterBar(page).getByRole("button", { name: "Editar filtro Min 900–3.000" })).toBeVisible();
  await expect(status(page)).toHaveText(`${count(expected)} de ${count(players.length)} jogadores`);
  await expect(table(page)).toHaveAttribute("aria-rowcount", String(expected + 1));
});

test("a saved comparison's pins become the Scout's filters once, and the column menu offers no comparison", async ({
  page,
}) => {
  const players = await servedPlayers(page);
  const inSerieB = players.filter((p) => p.division === SERIE_B).length;
  await open(page);
  await page.evaluate((league) => {
    localStorage.setItem(
      "moneyball-fm27:v1:universe",
      JSON.stringify({ group: "ATA", minMinutes: 900, leagues: [league], pinned: [] }),
    );
  }, SERIE_B);
  await page.reload();

  const chip = filterBar(page).getByRole("button", { name: `Editar filtro Liga: ${SERIE_B}` });
  await expect(chip).toBeVisible(LOADED);
  await expect(status(page)).toHaveText(`${count(inSerieB)} de ${count(players.length)} jogadores`, LOADED);
  await expect(page.getByRole("group", { name: "Comparando com" })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("moneyball-fm27:v1:universe"))).toBe("null");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("moneyball-fm27:v1:filters"))).toContain(SERIE_B);

  await header(page, "division").click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Remover filtro" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /comparação/ })).toHaveCount(0);
  await page.getByRole("menuitem", { name: "Remover filtro" }).click();
  await expect(chip).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("moneyball-fm27:v1:filters")))
    .not.toContain(SERIE_B);
  await page.reload();
  await expect(table(page).locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
  await expect(status(page)).toHaveText(`${count(players.length)} jogadores`, LOADED);
  await expect(chip).toHaveCount(0);
});

test("impossible filter shows empty state", async ({ page }) => {
  await open(page);
  let editor = await filterFromHeader(page, "age");
  await typeBound(editor, "Mínimo", "99");
  await closeEditor(page);
  editor = await filterFromHeader(page, "minutes");
  await typeBound(editor, "Mínimo", "99999");
  await closeEditor(page);

  await expect(page.getByRole("heading", { name: "Nenhum jogador" })).toBeVisible();
  await expect(table(page).locator("tbody tr[data-player]")).toHaveCount(0);
  await expect(header(page, "age")).toBeVisible();

  await page.getByRole("main").getByRole("button", { name: "Limpar filtros" }).last().click();
  await expect(table(page).locator("tbody tr[data-player]").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nenhum jogador" })).toHaveCount(0);
});

test("clear all resets", async ({ page }) => {
  const players = await servedPlayers(page);
  await open(page);
  let editor = await filterFromHeader(page, "age");
  await typeBound(editor, "Máximo", "23");
  await closeEditor(page);
  editor = await filterFromHeader(page, "minutes");
  await typeBound(editor, "Mínimo", "900");
  await closeEditor(page);
  await expect(filterBar(page).getByRole("button", { name: /^Editar filtro/ })).toHaveCount(2);

  await filterBar(page).getByRole("button", { name: "Limpar filtros" }).click();
  await expect(filterBar(page).getByRole("button", { name: /^Editar filtro/ })).toHaveCount(0);
  await expect(status(page)).toHaveText(`${count(players.length)} jogadores`);
});

test("filters persist across reload", async ({ page }) => {
  const players = await servedPlayers(page);
  const young = players.filter((p) => p.age != null && p.age <= 23).length;
  await open(page);
  const editor = await filterFromHeader(page, "age");
  await typeBound(editor, "Máximo", "23");
  await closeEditor(page);
  await expect(status(page)).toHaveText(`${count(young)} de ${count(players.length)} jogadores`);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("moneyball-fm27:v1:filters"))).toContain('"age"');

  await page.reload();
  const chip = filterBar(page).getByRole("button", { name: "Editar filtro Idade ≤ 23" });
  await expect(chip).toBeVisible(LOADED);
  await expect(status(page)).toHaveText(`${count(young)} de ${count(players.length)} jogadores`, LOADED);

  const saved = await page.evaluate(() => localStorage.getItem("moneyball-fm27:v1:filters"));
  await chip.click();
  await page.getByRole("dialog").getByRole("textbox", { name: "Máximo" }).press("Enter");
  await closeEditor(page);
  await expect(chip).toBeVisible();
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => localStorage.getItem("moneyball-fm27:v1:filters"))).toBe(saved);
});

test("a hide-only filter leaves the percentiles on show untouched", async ({ page }) => {
  await open(page);
  await page.getByRole("radio", { name: "Percentil" }).click();
  const rows = table(page).locator("tbody tr[data-player]");
  const top = () =>
    rows.evaluateAll((trs) =>
      trs.slice(0, 12).map((tr) => ({
        uid: (tr as HTMLElement).dataset.player,
        age: Number(tr.querySelector('[data-column-id="age"]')?.textContent),
        pct: [...tr.querySelectorAll("td [aria-hidden]")].map((cell) => cell.textContent).join(" "),
      })),
    );
  const before = await top();
  const oldest = Math.max(...before.map((r) => r.age));
  const editor = await filterFromHeader(page, "age");
  await typeBound(editor, "Máximo", String(oldest));
  await closeEditor(page);
  await expect(filterBar(page).getByRole("button", { name: `Editar filtro Idade ≤ ${oldest}` })).toBeVisible();
  await expect(status(page)).toContainText(" de ");
  expect(await top()).toEqual(before);
});

test.describe("contract dates typed into the date field", () => {
  test.use({ locale: "pt-BR" });

  test("a half-typed date never becomes a filter; Enter commits the whole date", async ({ page }) => {
    await open(page);
    const editor = await filterFromHeader(page, "contract_end");
    const from = editor.getByLabel("De");
    await from.click({ position: { x: 14, y: 16 } });
    const contractChips = filterBar(page).getByRole("button", { name: /^Editar filtro Contrato/ });
    const passedThrough: string[] = [];
    for (const key of ["0", "7", "0", "7", "2", "0", "2", "7"]) {
      await page.keyboard.press(key);
      passedThrough.push(await from.inputValue());
      await expect(contractChips).toHaveCount(0);
    }
    expect(passedThrough).toContain("0002-07-07");
    await expect(from).toHaveValue("2027-07-07");
    await page.keyboard.press("Enter");
    await expect(
      filterBar(page).getByRole("button", { name: "Editar filtro Contrato a partir de 07/07/2027" }),
    ).toBeVisible();
  });
});
