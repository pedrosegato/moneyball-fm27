import { expect, type Page, test } from "@playwright/test";

const LOADED = { timeout: 60_000 };

interface ServedPlayer {
  uid: number;
  name: string | null;
  club: string | null;
}

let served: { players: ServedPlayer[] } | null = null;

async function servedSnapshot(page: Page) {
  served ??= (await (await page.request.get("/__dev/snapshot")).json()) as { players: ServedPlayer[] };
  return served;
}

const count = (n: number) => n.toLocaleString("pt-BR");
const table = (page: Page) => page.getByRole("table", { name: "Jogadores" });
const status = (page: Page) => page.getByRole("region", { name: "Tabela de jogadores" }).getByRole("status");
const columnGroups = (page: Page) => page.getByRole("group", { name: "Grupos de colunas" });
const groupChip = (page: Page, name: string) => columnGroups(page).getByRole("button", { name, exact: true });
const positionControl = (page: Page) => page.getByRole("button", { name: /^Posição: / });
const criteria = (page: Page) => page.getByRole("group", { name: "Critérios do Moneyball" });
const filterBar = (page: Page) => page.getByRole("group", { name: "Filtros ativos" });
const header = (page: Page, id: string) => table(page).locator(`thead [data-column-id="${id}"]`);

async function open(page: Page, { moneyball = false } = {}) {
  await page.goto("/#/scout");
  await expect(table(page).locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
  if (!moneyball) return;
  await page.getByRole("button", { name: "Só subvalorizados (Moneyball)", exact: true }).click();
  await expect(table(page).locator('thead [data-column-id="valueRatio"]')).toBeVisible();
}

async function openCriteria(page: Page) {
  await page.getByRole("button", { name: /^Critérios/ }).click();
  await expect(criteria(page)).toBeVisible();
}

async function shownCount(page: Page): Promise<number> {
  const text = (await status(page).textContent()) ?? "";
  return Number(/^[\d.]+/.exec(text)?.[0].replaceAll(".", ""));
}

async function listedUids(page: Page): Promise<string[]> {
  const rows = Number(await table(page).getAttribute("aria-rowcount")) - 1;
  return table(page).evaluate(async (t, total) => {
    const scroller = t.parentElement!;
    const seen = new Map<number, string>();
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    scroller.scrollTop = 0;
    for (let guard = 0; seen.size < total && guard < 1000; guard++) {
      await frame();
      for (const tr of t.querySelectorAll<HTMLElement>("tbody tr[data-position]")) {
        seen.set(Number(tr.dataset.position), tr.dataset.player!);
      }
      scroller.scrollTop += Math.max(1, scroller.clientHeight - 80);
    }
    return Array.from({ length: total }, (_, k) => seen.get(k) ?? "?");
  }, rows);
}

async function engineMoneyball(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const load = (path: string) => import(path);
    const { DEFAULT_ENGINE_SETTINGS } = await load("/src/engine/analysis/input.ts");
    const { prepareSnapshot } = await load("/src/engine/analysis/prepare.ts");
    const { analyzeModel } = await load("/src/engine/analysis/model.ts");
    const { scorePlayers } = await load("/src/engine/analysis/score.ts");
    const snapshot = await (await fetch("/__dev/snapshot")).json();
    const prepared = prepareSnapshot(snapshot);
    const settings = DEFAULT_ENGINE_SETTINGS;
    const myClubUid = snapshot.my_clubs.find((c: { uid: number | null }) => c.uid !== null)?.uid ?? null;
    const model = analyzeModel(prepared, {
      poolMinutes: settings.poolMinutes,
      myClubUid,
    });
    const { moneyball } = scorePlayers(prepared, model, { myClubUid, settings });
    return Array.from(moneyball as Uint32Array, (uid) => String(uid));
  });
}

test("the Scout opens with no filter and no comparison, all players listed", async ({ page }) => {
  const { players } = await servedSnapshot(page);
  await open(page);
  await expect(status(page)).toHaveText(`${count(players.length)} jogadores`, LOADED);
  await expect(page.getByRole("group", { name: "Comparando com" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /comparação/ })).toHaveCount(0);
  await expect(filterBar(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Filtros", exact: true })).toBeVisible();
  await expect(groupChip(page, "Geral")).toHaveAttribute("aria-pressed", "true");
  await expect(positionControl(page)).toHaveText("Posição: Todas");
  await header(page, "minutes").click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Filtrar…" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /comparação/ })).toHaveCount(0);
});

test("the Posição control filters strikers and shows the Atacante preset", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await open(page);
  await positionControl(page).click();
  await page.getByRole("menuitemradio", { name: "Atacante" }).click();
  await expect(positionControl(page)).toHaveText("Posição: Atacante");
  await expect(page.getByRole("button", { name: /^Editar filtro Pos/ })).toHaveCount(0);

  await expect(groupChip(page, "Geral")).toHaveAttribute("aria-pressed", "true");
  await expect(header(page, "perf")).toHaveAttribute("aria-sort", "descending", LOADED);
  await expect(header(page, "perfAdj-ATA")).toHaveCount(0);
  await expect(header(page, "SoT%")).toBeVisible();
  await expect(header(page, "Tck%")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Comparando com" })).toHaveCount(0);

  const chips = table(page).locator('tbody tr[data-player] [data-column-id="G/90"] [data-slot="stat-cell"]');
  const said = await chips.locator(".sr-only").allTextContents();
  expect(said.length).toBeGreaterThan(5);
  for (const text of said)
    expect(text).toMatch(
      /, percentil \d+ contra os [a-zç-]+ com 300\+ min$|: (amostra pequena|poucos na posição|sem dados)$/,
    );
  expect(said.some((text) => text.endsWith("contra os atacantes com 300+ min"))).toBe(true);
  const striker = chips.filter({ hasText: "contra os atacantes com 300+ min" }).first();
  await expect(striker).toHaveAttribute("title", /^percentil \d+ contra os atacantes com 300\+ min$/);

  await positionControl(page).click();
  await page.getByRole("menuitemradio", { name: "Todas" }).click();
  await expect(positionControl(page)).toHaveText("Posição: Todas");
  await expect(header(page, "perf")).toBeVisible(LOADED);
  await expect(header(page, "SoT%")).toHaveCount(0);
});

test("a Pos filter set from the column reads in the Posição control", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await open(page);
  await header(page, "position").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Filtrar…" }).click();
  const editor = page.getByRole("dialog");
  await editor.getByRole("searchbox", { name: "Buscar" }).fill("ST");
  await editor.getByRole("checkbox", { name: /^ST\b/ }).click();
  await page.keyboard.press("Escape");
  await expect(positionControl(page)).toHaveText("Posição: Atacante");
  await expect(filterBar(page)).toHaveCount(0);
  await expect(header(page, "perf")).toHaveAttribute("aria-sort", "descending", LOADED);
});

test("column groups combine: the player's facts and the chosen groups, not the preset's stats", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await open(page);
  await expect(header(page, "KP/90")).toBeVisible();
  await groupChip(page, "Cabeceio").click();
  await groupChip(page, "Passe").click();
  await expect(groupChip(page, "Passe")).toHaveAttribute("aria-pressed", "true");
  await expect(groupChip(page, "Cabeceio")).toHaveAttribute("aria-pressed", "true");
  await expect(groupChip(page, "Geral")).toHaveAttribute("aria-pressed", "false");
  await expect(header(page, "rating")).toBeVisible();
  await expect(header(page, "PsC/90")).toBeVisible();
  await expect(header(page, "HdrWon/90")).toBeVisible();
  await expect(header(page, "KP/90")).toHaveCount(0);
  const order = await table(page)
    .locator("thead th[data-column-id]")
    .evaluateAll((ths) => ths.map((th) => th.dataset.columnId));
  expect(order.indexOf("rating")).toBeLessThan(order.indexOf("PsC/90"));
  expect(order.indexOf("PsC/90")).toBeLessThan(order.indexOf("HdrWon/90"));

  await page.keyboard.press("Space");
  await expect(groupChip(page, "Passe")).toHaveAttribute("aria-pressed", "false");
  await expect(header(page, "PsC/90")).toHaveCount(0);
  await groupChip(page, "Geral").click();
  await expect(groupChip(page, "Cabeceio")).toHaveAttribute("aria-pressed", "false");
  await expect(groupChip(page, "Geral")).toHaveAttribute("aria-pressed", "true");
  await expect(header(page, "KP/90")).toBeVisible();
});

test("the table search narrows only its table", async ({ page }) => {
  const { players } = await servedSnapshot(page);
  await open(page);
  const search = page.getByRole("searchbox", { name: "Buscar nesta lista" });
  await search.fill("negueba");
  await expect(status(page)).toContainText(` de ${count(players.length)} jogadores`);

  await page.goto("/#/elenco");
  const squadSearch = page.getByRole("searchbox", { name: "Buscar nesta lista" });
  await expect(squadSearch).toHaveValue("", LOADED);
  await expect(status(page)).not.toContainText(" de ", LOADED);

  await page.goto("/#/scout");
  await expect(search).toHaveValue("negueba", LOADED);
  await expect(status(page)).toContainText(` de ${count(players.length)} jogadores`);
});

test("the Moneyball chip lists golden uids with default criteria", async ({ page }) => {
  test.setTimeout(180_000);
  await open(page, { moneyball: true });
  await openCriteria(page);
  await expect(criteria(page).getByRole("textbox", { name: /^Razão mínima/ })).toHaveValue("2");
  await expect(criteria(page).getByRole("textbox", { name: /^Performance mínima/ })).toHaveValue("60");
  const rate = await page.evaluate(async () => (await (await fetch("/__dev/snapshot")).json()).money?.rate ?? 1);
  await expect(criteria(page).getByRole("textbox", { name: /^Valor justo mínimo/ })).toHaveValue(
    ((250_000 * rate) / 1_000_000).toFixed(2).replace(".", ","),
  );
  await page.keyboard.press("Escape");
  await expect(criteria(page)).toHaveCount(0);
  await expect(table(page).locator('thead [data-column-id="valueRatio"]')).toHaveAttribute("aria-sort", "descending");

  const engine = await engineMoneyball(page);
  expect(engine.length).toBeGreaterThan(0);
  await expect(status(page)).toHaveText(`${count(engine.length)} jogadores`);
  expect(await listedUids(page)).toEqual(engine);
  test.info().annotations.push({ type: "moneyball", description: `${engine.length} listed` });
});

test("changing min ratio to 3 narrows the list", async ({ page }) => {
  await open(page, { moneyball: true });
  const before = await shownCount(page);
  expect(before).toBeGreaterThan(0);
  await openCriteria(page);

  const ratio = criteria(page).getByRole("textbox", { name: /^Razão mínima/ });
  await ratio.fill("3");
  await ratio.press("Enter");
  await page.keyboard.press("Escape");

  await expect.poll(() => shownCount(page), LOADED).toBeLessThan(before);
  expect(await shownCount(page)).toBeGreaterThan(0);
  const ratios = await table(page)
    .locator('tbody tr[data-player] [data-column-id="valueRatio"]')
    .evaluateAll((cells) =>
      cells.map((c) => Number(c.textContent!.replace("×", "").replaceAll(".", "").replace(",", "."))),
    );
  expect(ratios.length).toBeGreaterThan(5);
  expect(ratios.every((r) => r >= 3)).toBe(true);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("moneyball-fm27:v1:settings")))
    .toContain('"minRatio":3');
});

test('the table search, in the head of the table and not in the page header, finds "Negueba"', async ({ page }) => {
  const { players } = await servedSnapshot(page);
  const plain = (s: string | null) => (s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const expected = players.filter((p) => plain(p.name).includes("negueba") || plain(p.club).includes("negueba"));
  await open(page);

  await page.keyboard.press("ControlOrMeta+k");
  const head = page.getByRole("region", { name: "Tabela de jogadores" }).getByRole("group", { name: "Quem aparece" });
  const search = head.getByRole("searchbox", { name: "Buscar nesta lista" });
  await expect(search).toBeFocused();
  await expect(page.getByRole("banner").getByRole("searchbox")).toHaveCount(0);
  await page.keyboard.type("negueba");

  await expect(status(page)).toHaveText(`${count(expected.length)} de ${count(players.length)} jogadores`);
  const negueba = table(page).locator('tbody tr[data-player="19358051"]');
  await expect(negueba).toBeVisible();
  await expect(negueba.getByRole("rowheader")).toContainText("Negueba");
  await expect(negueba.getByRole("rowheader")).toContainText(players.find((p) => p.uid === 19358051)!.club!);

  await search.press("Escape");
  await expect(status(page)).toHaveText(`${count(players.length)} jogadores`);
});

test("select 2 rows, the floating bar adds both to the cart, and Esc clears the selection", async ({ page }) => {
  await open(page);
  const rows = table(page).locator("tbody tr[data-player]");
  const first = rows.nth(0);
  await first.getByRole("checkbox").click();
  await page.keyboard.down("Shift");
  await rows.nth(1).getByRole("checkbox").click();
  await page.keyboard.up("Shift");
  await expect(table(page).locator("tbody tr[data-checked]")).toHaveCount(2);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const bar = page.getByRole("toolbar", { name: "Seleção" });
  await expect(bar).toContainText("2 selecionados");
  await expect(bar.getByRole("button", { name: "Comparar" })).toBeEnabled();
  await expect(bar.getByRole("button", { name: "Abrir perfil" })).toHaveAttribute("aria-disabled", "true");
  const moves = bar.getByRole("button", { name: /^(Adicionar ao carrinho|Vender)/ });
  for (let k = 0; k < (await moves.count()); k++) await moves.nth(k).click();
  await expect(page.getByRole("banner").getByRole("link", { name: "Carrinho, 2 itens" })).toBeVisible();

  await first.click({ position: { x: 120, y: 20 } });
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await first.press("Escape");
  await expect(table(page).locator("tbody tr[data-checked]")).toHaveCount(0);
  await expect(bar).toHaveCount(0);
});

test("rows are striped by their place and every stat header explains itself", async ({ page }) => {
  await open(page);
  const rows = table(page).locator("tbody tr[data-player]");
  await expect(rows.nth(1)).toHaveAttribute("data-odd", "true");
  await expect(rows.nth(0)).not.toHaveAttribute("data-odd");
  const backgrounds = await rows.evaluateAll((trs) =>
    trs.slice(0, 2).map((tr) => getComputedStyle(tr).backgroundColor),
  );
  expect(backgrounds[0]).not.toBe(backgrounds[1]);
  await page.getByRole("button", { name: "npxG/90", exact: true }).hover();
  await expect(page.locator("[data-slot=tooltip-content]")).toContainText(
    "Gols esperados sem pênalti (npxG) por 90 — gols esperados",
  );
});
