import { expect, type Page, test } from "@playwright/test";

const LOADED = { timeout: 60_000 };

const count = (n: number) => n.toLocaleString("pt-BR");
const chart = (page: Page) => page.getByRole("region", { name: "Gráfico de dispersão" });
const plotted = (page: Page) => chart(page).getByRole("status");
const labeled = (page: Page) => page.getByRole("table", { name: "Pontos rotulados" });
const filterBar = (page: Page) => page.getByRole("group", { name: "Filtros ativos" });

async function openGraphs(page: Page) {
  await page.goto("/#/graficos");
  await expect(labeled(page).locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
}

async function enginePoints(page: Page, maxAge: number | null): Promise<number> {
  return page.evaluate(async (maxAge) => {
    const load = (path: string) => import(path);
    const { DEFAULT_ENGINE_SETTINGS } = await load("/src/engine/analysis/input.ts");
    const { prepareSnapshot } = await load("/src/engine/analysis/prepare.ts");
    const { analyzeDisplay } = await load("/src/engine/analysis/display.ts");
    const snapshot = await (await fetch("/__dev/snapshot")).json();
    const prepared = prepareSnapshot(snapshot);
    const { poolMinutes } = DEFAULT_ENGINE_SETTINGS;
    const display = analyzeDisplay(prepared, { poolMinutes, composites: [] });
    const x = prepared.result.cols["npxG/90"] as Float64Array;
    const y = prepared.result.cols["npG/90"] as Float64Array;
    let n = 0;
    snapshot.players.forEach((p: { age: number | null }, i: number) => {
      if (!display.pool[i] || Number.isNaN(x[i]) || Number.isNaN(y[i])) return;
      if (maxAge !== null && !(p.age !== null && p.age <= maxAge)) return;
      n++;
    });
    return n;
  }, maxAge);
}

test("scatter respects table filters", async ({ page }) => {
  await openGraphs(page);
  await expect(page.getByRole("group", { name: "Comparando com" })).toHaveCount(0);
  const everyone = await enginePoints(page, null);
  await expect(plotted(page)).toHaveText(new RegExp(`^${count(everyone)} jogadores com 300\\+ min no gráfico`));

  await page.evaluate(() =>
    localStorage.setItem("moneyball-fm27:v1:filters", JSON.stringify([{ col: "age", kind: "range", max: 21 }])),
  );
  await page.reload();
  const young = await enginePoints(page, 21);
  expect(young).toBeGreaterThan(0);
  expect(young).toBeLessThan(everyone);
  await expect(plotted(page)).toHaveText(new RegExp(`^${count(young)} jogadores com 300\\+ min no gráfico`), LOADED);
  await expect(filterBar(page).getByRole("button", { name: "Editar filtro Idade ≤ 21" })).toBeVisible();

  await filterBar(page).getByRole("button", { name: "Limpar filtros" }).click();
  await expect(plotted(page)).toHaveText(new RegExp(`^${count(everyone)} jogadores com 300\\+ min no gráfico`));
  await page.goto("/#/scout");
  await expect(page.getByRole("group", { name: "Filtros ativos" })).toHaveCount(0, LOADED);
});

test("click a labeled point opens the panel", async ({ page }) => {
  await openGraphs(page);
  const rows = labeled(page).locator("tbody tr[data-player]");
  await expect(rows).toHaveCount(10);

  const first = rows.first();
  const uid = await first.getAttribute("data-player");
  const name = (await first.locator("th").textContent())!.trim();
  const dot = chart(page).locator(`svg [data-player="${uid}"]`);
  const box = (await dot.boundingBox())!;
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  await page.mouse.move(centre.x, centre.y);
  await expect(chart(page).getByRole("tooltip")).toContainText(name);

  await page.mouse.click(centre.x, centre.y);
  await expect(page.getByRole("dialog", { name })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(first).toBeFocused();

  const second = rows.nth(1);
  const secondName = (await second.locator("th").textContent())!.trim();
  await page.mouse.move(0, 0);
  await first.focus();
  await page.keyboard.press("ArrowDown");
  await expect(second).toBeFocused();
  await expect(chart(page).getByRole("tooltip")).toContainText(secondName);
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", { name: secondName });
  await expect(sheet).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(second).toBeFocused();
});

async function engineLevels(page: Page): Promise<Record<string, number>> {
  return page.evaluate(async () => {
    const load = (path: string) => import(path);
    const { appStore } = await load("/src/store/index.ts");
    const { pointSet } = await load("/src/pages/graphs/lib/scatter.ts");
    const { pointLevels } = await load("/src/pages/graphs/lib/levels.ts");
    const { analysis, visible } = appStore.getState().data;
    const points = pointSet(
      analysis.uids.length,
      { visible: visible.scout, pool: analysis.pool },
      analysis.cols["npxG/90"],
      analysis.cols["npG/90"],
    );
    return pointLevels(points, true, true).counts;
  });
}

test("points take the colour of their level on both axes, counted in the legend and told in the list", async ({
  page,
}) => {
  await openGraphs(page);
  const counts = await engineLevels(page);
  const legend = chart(page).getByRole("list", { name: "Níveis no gráfico" }).getByRole("listitem");
  await expect(legend).toHaveText(
    ["Elite", "Bom", "Mediano", "Abaixo", "Ruim"].map((name, k) => {
      const n = Object.values(counts)[k];
      return new RegExp(`^${name}${count(n).replace(".", "\\.")} jogador`);
    }),
  );
  const total = (await plotted(page).textContent())!.match(/^([\d.]+)/)![1];
  expect(count(Object.values(counts).reduce((a, b) => a + b, 0))).toBe(total);

  await expect(labeled(page).locator('tbody tr[data-player] [data-slot="stat-cell"][data-tier]')).toHaveCount(10);

  const toggle = chart(page).getByRole("button", { name: "Como ler este gráfico" });
  await toggle.click();
  const help = chart(page).getByRole("region", { name: "Como ler este gráfico" });
  await expect(help).toContainText("Mais à direita, mais npxG/90");
  await expect(help).toContainText("Mais acima, mais npG/90");
  await toggle.click();
  await expect(help).toHaveCount(0);
});

test("compare up to 3 players", async ({ page }) => {
  await openGraphs(page);
  const rows = labeled(page).locator("tbody tr[data-player]");
  const names: string[] = [];
  for (let k = 0; k < 4; k++) {
    const row = rows.nth(k);
    const name = (await row.locator("th").textContent())!.trim();
    names.push(name);
    await row.click();
    const sheet = page.getByRole("dialog", { name });
    await sheet.getByRole("button", { name: "Comparar" }).click();
  }
  await expect(page.getByText(/Comparar já tem 3 jogadores/)).toBeVisible();
  await expect(page.getByRole("dialog", { name: names[3] }).getByRole("button", { name: "Comparar" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await page.getByRole("link", { name: "Comparar" }).click();
  const players = page.getByRole("list", { name: "Jogadores comparados" }).locator(":scope > li");
  await expect(players).toHaveCount(3);
  for (const [k, name] of names.slice(0, 3).entries()) await expect(players.nth(k)).toContainText(name);
  const stats = page.getByRole("table", { name: "Stats lado a lado" });
  await expect(stats.getByRole("columnheader", { name: names[0] })).toBeVisible();
  await expect(stats.locator("tbody tr")).not.toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("NaN");

  await page.setViewportSize({ width: 1280, height: 800 });
  const open = players.nth(1).getByRole("button", { name: `Abrir ${names[1]}` });
  await open.click();
  await expect(page.getByRole("dialog", { name: names[1] })).toBeVisible();
  expect(await page.evaluate(() => [document.scrollingElement!.scrollHeight, innerHeight])).toEqual([800, 800]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(open).toBeFocused();
  await open.press("Enter");
  await expect(page.getByRole("dialog", { name: names[1] })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(open).toBeFocused();

  await players
    .nth(0)
    .getByRole("button", { name: `Remover ${names[0]}` })
    .click();
  await expect(players).toHaveCount(2);
  await expect(stats.getByRole("columnheader", { name: names[0] })).toHaveCount(0);
  await players
    .nth(0)
    .getByRole("button", { name: `Remover ${names[1]}` })
    .click();
  await players
    .nth(0)
    .getByRole("button", { name: `Remover ${names[2]}` })
    .click();
  await expect(page.getByRole("heading", { name: "Ninguém para comparar" })).toBeVisible();
});

test("draws the whole save", async ({ page }, testInfo) => {
  const played = (
    (await (await page.request.get("/__dev/snapshot")).json()).players as { season: { minutes: number } | null }[]
  ).filter((p) => (p.season?.minutes ?? 0) > 0).length;
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("moneyball-fm27:v1:settings", JSON.stringify({ engine: { poolMinutes: 1 } })),
  );
  await page.goto("/#/graficos");
  await page.reload();
  await expect(labeled(page).locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
  await expect(page.getByRole("group", { name: "Comparando com" })).toHaveCount(0);

  for (const [name, stat] of [
    ["X", "G/90"],
    ["Y", "Ast/90"],
  ]) {
    await page.getByRole("button", { name: new RegExp(`^Eixo ${name}:`) }).click();
    await page.getByRole("combobox", { name: `Buscar stat do eixo ${name}` }).fill(stat);
    await page.getByRole("option", { name: new RegExp(`^${stat.replace("/", "\\/")} `) }).click();
  }
  await expect(plotted(page)).toHaveText(new RegExp(`^${count(played)} jogadores com 1\\+ min no gráfico`));

  const timing = await page.evaluate(async () => {
    const swap = document.querySelector<HTMLButtonElement>('button[aria-label="Trocar eixos"]')!;
    const start = performance.now();
    swap.click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return {
      total: performance.now() - start,
      draw: performance.getEntriesByName("scatter-draw").at(-1)?.duration ?? NaN,
    };
  });
  testInfo.annotations.push({
    type: "scatter-draw-ms",
    description: `${count(played)} pontos: canvas ${timing.draw.toFixed(1)} ms, clique até a tela ${timing.total.toFixed(1)} ms`,
  });
  expect(timing.total).toBeLessThan(250);
});
