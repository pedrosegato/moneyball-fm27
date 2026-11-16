import { expect, type Locator, type Page, test } from "@playwright/test";

const LOADED = { timeout: 60_000 };
const ROW = 40;
const HEADER = 40;
const MAX_DOM_ROWS = 120;

declare global {
  interface Window {
    __layoutShift: number;
  }
}

async function servedPlayers(page: Page): Promise<number> {
  const snapshot = await (await page.request.get("/__dev/snapshot")).json();
  return snapshot.players.length;
}

function geometry(table: Locator) {
  return table.evaluate(
    (t, { row, header }) => {
      const top = t.getBoundingClientRect().top;
      const rows = [...t.querySelectorAll<HTMLElement>("tbody tr[data-player]")];
      const misplaced = rows.filter((r) => {
        const expected = top + header + Number(r.dataset.position) * row;
        return Math.abs(r.getBoundingClientRect().top - expected) > 0.5 || Math.abs(r.offsetHeight - row) > 0.5;
      });
      return { mounted: rows.length, misplaced: misplaced.length, height: t.getBoundingClientRect().height };
    },
    { row: ROW, header: HEADER },
  );
}

test("scrolls 45985 rows without layout shift", async ({ page }) => {
  const players = await servedPlayers(page);
  await page.addInitScript(() => {
    window.__layoutShift = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!e.hadRecentInput) window.__layoutShift += e.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/");
  const table = page.getByRole("table", { name: "Jogadores" });
  await expect(table).toHaveAttribute("aria-rowcount", String(players + 1), LOADED);
  await expect(page.getByRole("region", { name: "Tabela de jogadores" })).toContainText(
    `${players.toLocaleString("pt-BR")} jogadores`,
  );
  const scroller = table.locator("xpath=..");
  await page.evaluate(() => (window.__layoutShift = 0));

  const start = await geometry(table);
  expect(start.height).toBe(HEADER + players * ROW);

  for (const fraction of [0.1, 0.37, 0.5, 0.83, 1]) {
    const target = await scroller.evaluate((el, f) => {
      el.scrollTop = Math.round((el.scrollHeight - el.clientHeight) * f);
      return el.scrollTop;
    }, fraction);
    const first = Math.max(0, Math.floor((target - HEADER) / ROW));
    await expect(table.locator(`tbody tr[data-position="${first + 1}"]`)).toBeAttached();
    const { mounted, misplaced, height } = await geometry(table);
    expect(mounted).toBeGreaterThan(10);
    expect(mounted).toBeLessThanOrEqual(MAX_DOM_ROWS);
    expect(misplaced).toBe(0);
    expect(height).toBe(start.height);
  }

  await expect(table.locator(`tbody tr[aria-rowindex="${players + 1}"]`)).toBeInViewport();
  expect(await page.evaluate(() => window.__layoutShift)).toBeLessThan(0.01);
});

test("sorting 46k rows by a stat answers within a frame budget", async ({ page }) => {
  await page.goto("/");
  const table = page.getByRole("table", { name: "Jogadores" });
  await expect(table.locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
  const header = page.getByRole("button", { name: "npxG/90", exact: true });
  const timings: number[] = [];
  for (let k = 0; k < 4; k++) {
    const before = await table.locator("tbody tr[data-player]").first().getAttribute("data-player");
    const ms = await header.evaluate(async (button) => {
      const t0 = performance.now();
      (button as HTMLButtonElement).click();
      await new Promise(requestAnimationFrame);
      return performance.now() - t0;
    });
    timings.push(ms);
    await expect(table.locator("tbody tr[data-player]").first()).not.toHaveAttribute("data-player", before!);
  }
  test
    .info()
    .annotations.push({ type: "sort click → next frame (ms)", description: timings.map(Math.round).join(", ") });
  expect(Math.min(...timings)).toBeLessThan(250);
});

test("worst-case dataset renders without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#/lab/tabela?data=worst");
  const table = page.getByRole("table", { name: "Jogadores" });
  await expect(table.getByText("João Henrique Gonçalves de Albuquerque Júnior")).toBeVisible();
  const chips = page.getByRole("group", { name: "Grupos de colunas" }).getByRole("button");
  for (const chip of (await chips.all()).slice(1)) await chip.click();

  for (const mode of ["Valor", "Percentil"]) {
    await page.getByRole("radio", { name: mode }).click();
    await expect(table).not.toContainText(/NaN|undefined|null|Infinity/);
    const report = await table.evaluate((t) => {
      const spills: string[] = [];
      for (const cell of t.querySelectorAll<HTMLElement>("tbody td, tbody th, thead th")) {
        const box = cell.getBoundingClientRect();
        for (const child of cell.querySelectorAll<HTMLElement>("*")) {
          if (child.closest(".sr-only") || child.hasAttribute("data-group-caption")) continue;
          const r = child.getBoundingClientRect();
          if (r.width && (r.left < box.left - 0.5 || r.right > box.right + 0.5)) {
            spills.push(`${cell.dataset.columnId}: ${child.textContent}`);
          }
        }
      }
      const tall = [...t.querySelectorAll<HTMLElement>("tbody tr[data-player]")].filter((r) => r.offsetHeight !== 40);
      return { spills, tall: tall.map((r) => r.textContent) };
    });
    expect(report.spills).toEqual([]);
    expect(report.tall).toEqual([]);
  }
});
