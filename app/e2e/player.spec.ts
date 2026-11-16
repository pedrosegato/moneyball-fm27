import { expect, type Locator, type Page, test } from "@playwright/test";

const LOADED = { timeout: 60_000 };

interface ServedPlayer {
  uid: number;
  name: string;
  club: string | null;
  value: number;
  wage: number | null;
  season: { minutes: number } | null;
}

let served: ServedPlayer[] | null = null;

async function servedPlayers(page: Page): Promise<ServedPlayer[]> {
  served ??= ((await (await page.request.get("/__dev/snapshot")).json()) as { players: ServedPlayer[] }).players;
  return served;
}

const STRIKER = "Yuri Alberto";

async function playerNamed(page: Page, name: string): Promise<ServedPlayer> {
  const matches = (await servedPlayers(page)).filter((p) => p.name === name);
  expect(matches, `exactly one "${name}" in the fixture`).toHaveLength(1);
  return matches[0];
}

async function unplayedPlayer(page: Page): Promise<ServedPlayer> {
  const players = await servedPlayers(page);
  const names = new Map<string, number>();
  for (const p of players) names.set(p.name, (names.get(p.name) ?? 0) + 1);
  const found = players.find((p) => !p.season?.minutes && names.get(p.name) === 1 && p.name.includes(" ") && p.club);
  expect(found).toBeDefined();
  return found!;
}

const table = (page: Page) => page.getByRole("table", { name: "Jogadores" });
const sheetOf = (page: Page, name: string) => page.getByRole("dialog", { name });

async function rowOf(page: Page, player: ServedPlayer): Promise<Locator> {
  await page.goto("/#/scout");
  await expect(table(page).locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
  await page.getByRole("searchbox", { name: "Buscar nesta lista" }).fill(player.name);
  const row = table(page).locator(`tbody tr[data-player="${player.uid}"]`);
  await expect(row).toBeVisible();
  return row;
}

async function engineProfile(page: Page, uid: number, keys: string[]) {
  return page.evaluate(
    async ({ uid, keys }) => {
      const load = (path: string) => import(path);
      const { DEFAULT_ENGINE_SETTINGS } = await load("/src/engine/analysis/input.ts");
      const { prepareSnapshot } = await load("/src/engine/analysis/prepare.ts");
      const { analyzeDisplay } = await load("/src/engine/analysis/display.ts");
      const percentiles = await load("/src/engine/percentiles.ts");
      const snapshot = await (await fetch("/__dev/snapshot")).json();
      const prepared = prepareSnapshot(snapshot);
      const display = analyzeDisplay(prepared, {
        poolMinutes: DEFAULT_ENGINE_SETTINGS.poolMinutes,
        composites: [],
      });
      const i = snapshot.players.findIndex((p: { uid: number }) => p.uid === uid);
      return keys.map((key) => ({
        key,
        pct: display.pct[key][i] as number,
        median: percentiles.referenceOf(display.reference, key, prepared.result.group[i]).median as number,
      }));
    },
    { uid, keys },
  );
}

const ptBR = (v: number, decimals: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

test("opening a player shows profile, pitch and head-to-head bars vs the group median", async ({ page }) => {
  const striker = await playerNamed(page, STRIKER);
  const row = await rowOf(page, striker);
  await row.click();

  const sheet = sheetOf(page, STRIKER);
  await expect(sheet).toBeVisible();
  await expect(row).toHaveAttribute("data-selected", "true");

  const fact = (label: string) =>
    sheet
      .getByRole("list", { name: "Ficha" })
      .getByRole("listitem")
      .filter({ has: page.getByText(label, { exact: true }) });
  const money = /(£|€|R\$|US\$|\$)\s?[\d.,]+\s?(M|mil)/;
  await expect(fact("Valor")).toContainText(money);
  await expect(fact("Salário")).toContainText(money);
  await expect(fact("Contrato")).toContainText(/\d{2}\/\d{2}\/\d{4}/);
  await expect(fact("Minutos")).toContainText(/\d/);
  const chip = (label: string) => fact(label).locator('[data-slot="stat-cell"]');
  await expect(chip("Perf.")).toHaveAttribute("data-tier", /.+/);
  const perf = (await chip("Perf.").locator("[aria-hidden]").textContent())!;
  expect(perf).toMatch(/^\d+$/);
  await expect(fact("Perf. aj.")).toHaveCount(0);
  await expect(fact("Força da liga").locator("span").last()).toHaveText(/^\d+$/);

  const positions = sheet.getByRole("region", { name: "Posições" });
  const pitch = positions.getByRole("list", { name: "Posições no campo" });
  await expect(pitch.getByLabel("Atacante (ST): natural")).toBeVisible();
  await expect(pitch.getByLabel("Ponta esquerda (AML): secundária")).toBeVisible();
  await expect(positions).toContainText("Ambos");

  const bars = sheet.getByRole("list", { name: "Perfil contra a mediana" });
  const items = bars.getByRole("listitem");
  const keys = [
    "npG/90",
    "npxG/90",
    "Shots/90",
    "SoT%",
    "xG/Shot",
    "xA/90",
    "KP/90",
    "Drb/90",
    "PresC/90",
    "HdrWon/90",
  ];
  await expect(items).toHaveCount(keys.length);
  const expected = await engineProfile(page, striker.uid, keys);
  for (const [k, { pct, median }] of expected.entries()) {
    expect(Number.isNaN(pct)).toBe(false);
    await expect(items.nth(k)).toHaveAttribute("aria-label", new RegExp(`percentil ${Math.round(pct)}\\b`));
    if (keys[k].endsWith("/90"))
      await expect(items.nth(k)).toHaveAttribute("aria-label", new RegExp(`mediana ${ptBR(median, 2)}`));
  }
  await expect(sheet.getByText("mediana", { exact: true })).toBeVisible();
  await expect(sheet.getByText("top 5%", { exact: true })).toBeVisible();

  await expect(sheet.getByRole("list", { name: "Top 10 stats" }).getByRole("listitem")).toHaveCount(10);
  await expect(sheet.getByRole("heading", { name: "Atributos" })).toBeVisible();
  await expect(sheet).not.toContainText("NaN");
  await expect(sheet.getByRole("region", { name: "Comparação" })).toContainText("Contra os atacantes com 300+ min");
  await expect(sheet).not.toContainText(/Comparando com|na comparação/);
});

test("a player under the pool shows — and amostra pequena for Perf. and Valor justo", async ({ page }) => {
  await page.goto("/#/scout");
  await expect(table(page).locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
  const benched = await page.evaluate(async () => {
    const load = (path: string) => import(path);
    const { appStore } = await load("/src/store/index.ts");
    const { analysis, snapshot } = appStore.getState().data;
    const names = new Map<string, number>();
    for (const p of snapshot.players) names.set(p.name, (names.get(p.name) ?? 0) + 1);
    for (let i = 0; i < analysis.uids.length; i++) {
      const p = snapshot.players[i];
      const numbers = [analysis.perf[i], analysis.fair[i]];
      if (!analysis.pool[i] && numbers.every(Number.isFinite) && names.get(p.name) === 1 && p.name.includes(" ")) {
        return { uid: p.uid as number, name: p.name as string };
      }
    }
    return null;
  });
  expect(benched).not.toBeNull();
  await page.getByRole("searchbox", { name: "Buscar nesta lista" }).fill(benched!.name);
  const row = table(page).locator(`tbody tr[data-player="${benched!.uid}"]`);
  await row.click();
  const ficha = sheetOf(page, benched!.name).getByRole("list", { name: "Ficha" });
  for (const label of ["Perf.", "Valor justo"]) {
    const fact = ficha.getByRole("listitem").filter({ has: page.getByText(label, { exact: true }) });
    await expect(fact.locator("[aria-hidden='true']").first()).toHaveText("—");
    await expect(fact.locator(".sr-only")).toHaveText(`${label}: amostra pequena`);
  }
});

test('unplayed player row shows "—"', async ({ page }) => {
  const player = await unplayedPlayer(page);
  const row = await rowOf(page, player);

  const chips = row.locator('[data-slot="stat-cell"] > [aria-hidden="true"]');
  expect(await chips.count()).toBeGreaterThan(0);
  expect(new Set(await chips.allTextContents())).toEqual(new Set(["—"]));

  await row.click();
  const sheet = sheetOf(page, player.name);
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("region", { name: "Comparação" })).toContainText("Sem minutos no escopo");
  await expect(sheet.getByRole("region", { name: "Top 10 stats" })).toContainText("Sem minutos no escopo");
  await expect(sheet.getByRole("heading", { name: "Atributos" })).toBeVisible();
  await expect(sheet).not.toContainText("NaN");
  await expect(sheet).not.toContainText(/(^|[^\d,])0%/);
});

test("the open panel never scrolls the page at 1280×800", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const striker = await playerNamed(page, STRIKER);
  const row = await rowOf(page, striker);
  await row.click();
  await expect(sheetOf(page, STRIKER)).toBeVisible();
  await expect(sheetOf(page, STRIKER).getByRole("list", { name: "Top 10 stats" })).toBeVisible();
  expect(await page.evaluate(() => [document.scrollingElement!.scrollHeight, innerHeight])).toEqual([800, 800]);
});

test("add to cart and shortlist from panel", async ({ page }) => {
  const striker = await playerNamed(page, STRIKER);
  const row = await rowOf(page, striker);
  await row.click();
  const sheet = sheetOf(page, STRIKER);

  const shortlist = sheet.getByRole("button", { name: "Shortlist" });
  await expect(shortlist).toHaveAttribute("aria-pressed", "false");
  await shortlist.click();
  await expect(shortlist).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("moneyball-fm27:v1:shortlist")))
    .toContain(String(striker.uid));

  const cart = sheet.getByRole("button", { name: "Carrinho" });
  await expect(cart).toHaveAttribute("aria-pressed", "false");
  await cart.click();
  await expect(cart).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(
      async () => JSON.parse((await page.evaluate(() => localStorage.getItem("moneyball-fm27:v1:cart"))) ?? "{}").items,
    )
    .toEqual([{ uid: striker.uid, kind: "buy", fee: striker.value, wage: striker.wage, name: STRIKER }]);
  await expect(page.getByRole("banner").getByRole("link", { name: "Carrinho, 1 item" })).toBeVisible();

  const compare = sheet.getByRole("button", { name: "Comparar" });
  await compare.click();
  await expect(compare).toHaveAttribute("aria-pressed", "true");
});

declare global {
  interface Window {
    __sheetTransitions: number[];
  }
}

async function watchTransitions(page: Page) {
  await page.evaluate(() => {
    window.__sheetTransitions = [];
    document.addEventListener("transitionrun", (e) => {
      const el = e.target as Element;
      if (!el.matches('[data-slot="player-sheet"]')) return;
      for (const a of el.getAnimations()) {
        if (a instanceof CSSTransition && a.transitionProperty === e.propertyName) {
          window.__sheetTransitions.push(Number(a.effect?.getTiming().duration ?? 0));
        }
      }
    });
  });
  return {
    async take(count = 0) {
      await expect.poll(() => page.evaluate(() => window.__sheetTransitions.length)).toBeGreaterThanOrEqual(count);
      return page.evaluate(() => window.__sheetTransitions.splice(0));
    },
    frames: () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))),
  };
}

async function timeToClose(page: Page, key: string): Promise<number> {
  const removed = page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const start = performance.now();
        const gone = () => !document.querySelector('[data-slot="player-sheet"]');
        const observer = new MutationObserver(() => {
          if (gone()) {
            observer.disconnect();
            resolve(performance.now() - start);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }),
  );
  await page.keyboard.press(key);
  return removed;
}

test("Esc closes without animation lag", async ({ page }) => {
  const striker = await playerNamed(page, STRIKER);
  const row = await rowOf(page, striker);
  const sheet = sheetOf(page, STRIKER);
  const transitions = await watchTransitions(page);

  await row.focus();
  await page.keyboard.press("Enter");
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveCSS("opacity", "1");
  await expect(sheet).toBeFocused();
  await transitions.frames();
  expect(await transitions.take()).toEqual([]);

  expect(await timeToClose(page, "Escape")).toBeLessThan(200);
  await expect(sheet).toHaveCount(0);
  await expect(row).toBeFocused();
  await expect(row).not.toHaveAttribute("data-selected");
  expect(await transitions.take()).toEqual([]);

  await row.click();
  await expect(sheet).toBeVisible();
  expect(await transitions.take(2)).toEqual([250, 250]);
  await expect.poll(() => sheet.evaluate((el) => el.getAnimations().length)).toBe(0);
  await sheet.getByRole("button", { name: "Fechar" }).click();
  expect(await transitions.take(2)).toEqual([200, 200]);
  await expect(sheet).toHaveCount(0, { timeout: 1000 });
  await expect(row).toBeFocused();
});
