import { expect, type Page, test } from "@playwright/test";

const LOADED = { timeout: 60_000 };
const TOP = 15;

const table = (page: Page) => page.getByRole("table", { name: "Jogadores" });

async function open(page: Page) {
  await page.goto("/#/rank");
  await expect(table(page).locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
}

async function topUids(page: Page, n = TOP): Promise<number[]> {
  return table(page)
    .locator("tbody tr[data-position]")
    .evaluateAll(
      (rows, count) =>
        rows
          .map((r) => r as HTMLElement)
          .sort((a, b) => Number(a.dataset.position) - Number(b.dataset.position))
          .slice(0, count)
          .map((r) => Number(r.dataset.player)),
      n,
    );
}

interface Expected {
  plain: number[];
  weighted: number[];
  leaderLeague: { key: string; division: string };
}

async function expectedRank(page: Page, weights: Record<string, number> = {}): Promise<Expected> {
  return page.evaluate(
    async ({ weights, top }) => {
      const load = (path: string) => import(path);
      const rank = await load("/src/engine/rank.ts");
      const league = await load("/src/engine/league.ts");
      const club = await load("/src/engine/club.ts");
      const { DEFAULT_ENGINE_SETTINGS } = await load("/src/engine/analysis/input.ts");
      const snapshot = await (await fetch("/__dev/snapshot")).json();
      const players = snapshot.players;
      const rating = Float64Array.from(players, rank.averageRating);
      const eligible = Uint8Array.from(players, (p: never) =>
        club.minutesOf(p) >= DEFAULT_ENGINE_SETTINGS.poolMinutes ? 1 : 0,
      );
      const plain: number[] = rank.rankOrder(rating, eligible);
      const weighted: number[] = rank.rankOrder(rank.rankScores(players, rating, weights), eligible);
      const leader = players[weighted[0]];
      return {
        plain: plain.slice(0, top).map((i) => players[i].uid),
        weighted: weighted.slice(0, top).map((i) => players[i].uid),
        leaderLeague: { key: league.leagueKey(leader.division), division: leader.division },
      };
    },
    { weights, top: TOP },
  );
}

test("ranks the pool by Av Rat, with and without the league weights", async ({ page }) => {
  await open(page);
  const expected = await expectedRank(page);
  await expect(
    page.getByRole("radiogroup", { name: "Peso da liga" }).getByRole("radio", { name: "Sem peso" }),
  ).toBeChecked();
  await expect.poll(() => topUids(page)).toEqual(expected.plain);
  await expect(table(page).locator('thead [data-column-id="rankWeighted"]')).toHaveCount(0);

  await page.getByRole("radio", { name: "Com peso da liga" }).click();
  await expect.poll(() => topUids(page)).toEqual(expected.weighted);
  await expect(table(page).locator('thead [data-column-id="rankWeighted"]')).toBeVisible();
  await expect(table(page).locator('thead [data-column-id="rankMove"]')).toBeVisible();
});

test("editing a league weight changes rank order", async ({ page }) => {
  await open(page);
  await page.getByRole("radio", { name: "Com peso da liga" }).click();
  const before = await expectedRank(page);
  await expect.poll(() => topUids(page)).toEqual(before.weighted);

  await page.getByRole("button", { name: "Pesos das ligas" }).click();
  const sheet = page.getByRole("dialog", { name: "Pesos das ligas" });
  await sheet.getByRole("searchbox", { name: "Buscar liga" }).fill(before.leaderLeague.division);
  const weight = sheet.getByRole("textbox", { name: `Peso de ${before.leaderLeague.division}` });
  await weight.fill("0,5");
  await weight.press("Enter");
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);

  const after = await expectedRank(page, { [before.leaderLeague.key]: 0.5 });
  expect(after.weighted).not.toEqual(before.weighted);
  await expect.poll(() => topUids(page)).toEqual(after.weighted);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("moneyball-fm27:v1:settings")))
    .toContain(`"leagueWeights":{"${before.leaderLeague.key}":0.5}`);

  await page.getByRole("button", { name: /^Pesos das ligas/ }).click();
  await sheet.getByRole("button", { name: "Restaurar pesos padrão" }).click();
  await page.keyboard.press("Escape");
  await expect.poll(() => topUids(page)).toEqual(before.weighted);
});

test("ranks by a stat's percentile when one is chosen", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: /^Ordenar por/ }).click();
  await page.getByRole("combobox", { name: "Buscar stat para ordenar" }).fill("G/90");
  await page
    .getByRole("option", { name: /^G\/90/ })
    .first()
    .click();
  await expect(page.getByRole("button", { name: /^Ordenar por: G\/90/ })).toBeVisible();
  await expect(table(page).locator('thead [data-column-id="rankBase"]')).toContainText("G/90 pct");
  const scores = await table(page)
    .locator('tbody tr[data-position] [data-column-id="rankBase"]')
    .evaluateAll((cells) =>
      cells
        .map((c) => [Number((c.closest("tr") as HTMLElement).dataset.position), Number(c.textContent)] as const)
        .sort((a, b) => a[0] - b[0])
        .map(([, v]) => v),
    );
  expect(scores.length).toBeGreaterThan(5);
  expect(scores).toEqual([...scores].sort((a, b) => b - a));
});

test("a position picked on Rank narrows Rank only, never the filters the other pages share", async ({ page }) => {
  await open(page);
  const savedFilters = () => page.evaluate(() => localStorage.getItem("moneyball-fm27:v1:filters"));
  const before = await savedFilters();
  const expected = await page.evaluate(async (top) => {
    const load = (path: string) => import(path);
    const rank = await load("/src/engine/rank.ts");
    const club = await load("/src/engine/club.ts");
    const positions = await load("/src/engine/positions.ts");
    const { DEFAULT_ENGINE_SETTINGS } = await load("/src/engine/analysis/input.ts");
    const players = (await (await fetch("/__dev/snapshot")).json()).players;
    const pool = DEFAULT_ENGINE_SETTINGS.poolMinutes;
    const eligible = Uint8Array.from(players, (p: { pos: number[] }) =>
      club.minutesOf(p) >= pool && positions.groupsOf(p.pos).includes("ZAG") ? 1 : 0,
    );
    const order: number[] = rank.rankOrder(Float64Array.from(players, rank.averageRating), eligible);
    return order.slice(0, top).map((i) => players[i].uid as number);
  }, TOP);

  await page.getByRole("button", { name: /^Posição do Rank/ }).click();
  await page.getByRole("menuitemradio", { name: "Zagueiro" }).click();
  await expect.poll(() => topUids(page)).toEqual(expected);
  await expect(page.getByRole("group", { name: "Filtros ativos" })).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(await savedFilters()).toBe(before);

  await page.goto("/#/scout");
  await expect(table(page).locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
  await expect(page.getByRole("group", { name: "Filtros ativos" })).toHaveCount(0);
});
