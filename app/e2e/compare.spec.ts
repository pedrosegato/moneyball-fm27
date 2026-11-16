import { expect, type Page, test } from "@playwright/test";

const LOADED = { timeout: 60_000 };

const stats = (page: Page) => page.getByRole("table", { name: "Stats lado a lado" });
const cards = (page: Page) => page.getByRole("list", { name: "Jogadores comparados" }).locator(":scope > li");

async function lineUp(page: Page, picks: number[]): Promise<number[]> {
  await page.goto("/#/scout");
  await expect(page.getByRole("table", { name: "Jogadores" }).locator("tbody tr[data-player]").first()).toBeVisible(
    LOADED,
  );
  return page.evaluate(async (picks) => {
    const load = (path: string) => import(path);
    const { appStore } = await load("/src/store/index.ts");
    const { POS_GROUPS } = await load("/src/engine/positions.ts");
    const { analysis } = appStore.getState().data;
    const strikers: number[] = [];
    for (let i = 0; i < analysis.uids.length; i++) {
      if (POS_GROUPS[analysis.group[i]] === "ATA" && analysis.pool[i] && !Number.isNaN(analysis.perf[i]))
        strikers.push(i);
    }
    strikers.sort((a, b) => analysis.perf[b] - analysis.perf[a]);
    const uids = picks.map((k) => analysis.uids[strikers[k]] as number);
    appStore.getState().setCompare(uids);
    location.hash = "#/comparar";
    return uids;
  }, picks);
}

async function expectedLeaders(page: Page, uids: number[], keys: string[]): Promise<boolean[][]> {
  return page.evaluate(
    async ({ uids, keys }) => {
      const load = (path: string) => import(path);
      const { appStore } = await load("/src/store/index.ts");
      const { STATS } = await load("/src/engine/stats/catalog.ts");
      const { rowLeaders } = await load("/src/pages/compare/lib/leaders.ts");
      const { analysis } = appStore.getState().data;
      return keys.map((key) => {
        const def = STATS.find((d: { key: string }) => d.key === key);
        return rowLeaders(
          uids.map((uid) => analysis.cols[key][analysis.uids.indexOf(uid)]),
          def,
        );
      });
    },
    { uids, keys },
  );
}

test("each stat row marks its leader, ties included and in the stat's own direction, with no overall verdict", async ({
  page,
}) => {
  const uids = await lineUp(page, [0, 3, 40]);
  await expect(cards(page)).toHaveCount(3);
  const rows = stats(page).locator("tbody tr[data-stat]");
  await expect(rows.first()).toBeVisible(LOADED);
  const keys = await rows.evaluateAll((trs) => trs.map((tr) => (tr as HTMLElement).dataset.stat!));
  const expected = await expectedLeaders(page, uids, keys);
  const shown = await rows.evaluateAll(
    (trs, uids) =>
      trs.map((tr) => uids.map((uid) => tr.querySelector(`td[data-player="${uid}"]`)!.hasAttribute("data-leader"))),
    uids,
  );
  expect(shown).toEqual(expected);
  expect(shown.flat().filter(Boolean).length).toBeGreaterThan(0);
  await expect(stats(page).locator('tbody td[data-player] [data-slot="stat-cell"]')).toHaveCount(keys.length * 3);
  await expect(page.locator("main")).not.toContainText(/melhor jogador|contrate/i);
  await expect(page.locator("main")).not.toContainText("NaN");
  await expect(page.getByRole("group", { name: "Comparando com" })).toHaveCount(0);
  await expect(page.getByText("Contra os atacantes com 300+ min", { exact: true })).toBeVisible();
  await expect(stats(page).locator(`tbody td[data-player="${uids[0]}"] .sr-only`).first()).toHaveText(
    /contra os atacantes com 300\+ min$|: sem dados$/,
  );

  for (const label of ["Perf."]) {
    const fact = cards(page)
      .first()
      .getByRole("list", { name: "Ficha" })
      .getByRole("listitem")
      .filter({ has: page.getByText(label, { exact: true }) });
    await expect(fact.locator('[data-slot="stat-cell"]')).toBeVisible();
  }
});

test("players of different positions are each coloured against their own, and the note names each group", async ({
  page,
}) => {
  await page.goto("/#/scout");
  await expect(page.getByRole("table", { name: "Jogadores" }).locator("tbody tr[data-player]").first()).toBeVisible(
    LOADED,
  );
  const picked = await page.evaluate(async () => {
    const load = (path: string) => import(path);
    const { appStore } = await load("/src/store/index.ts");
    const { POS_GROUPS } = await load("/src/engine/positions.ts");
    const { analysis } = appStore.getState().data;
    const best = (group: string) => {
      let at = -1;
      for (let i = 0; i < analysis.uids.length; i++) {
        if (POS_GROUPS[analysis.group[i]] !== group || Number.isNaN(analysis.perf[i]) || !analysis.pool[i]) continue;
        if (at < 0 || analysis.perf[i] > analysis.perf[at]) at = i;
      }
      return at;
    };
    const [zag, ata] = [best("ZAG"), best("ATA")];
    const uids = [analysis.uids[zag] as number, analysis.uids[ata] as number];
    appStore.getState().setCompare(uids);
    location.hash = "#/comparar";
    return { uids, names: [zag, ata].map((i) => appStore.getState().data.snapshot.players[i].name as string) };
  });
  await expect(cards(page)).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Stats da posição: Zagueiro" })).toBeVisible(LOADED);
  await expect(
    page.getByText(
      `Cada um contra os da posição dele com 300+ min: ${picked.names[0]} contra os zagueiros; ${picked.names[1]} contra os atacantes`,
    ),
  ).toBeVisible();
  const said = (uid: number) => stats(page).locator(`tbody td[data-player="${uid}"] .sr-only`).allTextContents();
  expect((await said(picked.uids[0])).some((t) => /contra os zagueiros com 300\+ min$/.test(t))).toBe(true);
  expect((await said(picked.uids[1])).some((t) => /contra os atacantes com 300\+ min$/.test(t))).toBe(true);
});

test("one player alone leads nothing", async ({ page }) => {
  await lineUp(page, [0]);
  await expect(cards(page)).toHaveCount(1);
  await expect(stats(page).locator("tbody tr[data-stat]").first()).toBeVisible(LOADED);
  await expect(stats(page).locator("[data-leader]")).toHaveCount(0);
});
