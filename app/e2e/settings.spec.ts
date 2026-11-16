import { expect, type Page, test } from "@playwright/test";

const LOADED = { timeout: 60_000 };

const VALUE_UNSET = [0, 300_000_000, 0xffff_ffff];

async function topMarketValue(page: Page): Promise<number> {
  const snapshot = (await (await page.request.get("/__dev/snapshot")).json()) as { players: { value: number }[] };
  return Math.max(...snapshot.players.map((p) => p.value).filter((v) => !VALUE_UNSET.includes(v)));
}

const GAME_REAIS = { currency: { code: "BRL", symbol: "R$", name: "Real" }, rate: 7.5, wage_period: "month" };

async function readGameInReais(page: Page) {
  await page.route("**/__dev/status", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...(await response.json()), money: GAME_REAIS } });
  });
}

const reais = (page: Page, pounds: number) =>
  page.evaluate(
    async ({ pounds, game }) => {
      const load = (path: string) => import(path);
      const { formatMoney, moneyOf } = await load("/src/lib/money.ts");
      return formatMoney(pounds, moneyOf(game)) as string;
    },
    { pounds, game: GAME_REAIS },
  );

const savedCart = (page: Page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("moneyball-fm27:v1:cart") ?? "{}") as {
        budgets?: Record<string, { transfer: number | null }>;
      },
  );

test("money follows the game's currency and rate", async ({ page }) => {
  await readGameInReais(page);
  await page.goto("/#/config");
  await expect(page.getByRole("region", { name: "Moeda" })).toContainText("(R$), salários por mês", LOADED);

  await page.goto("/#/scout");
  const table = page.getByRole("table", { name: "Jogadores" });
  await expect(table.locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
  await page.getByRole("button", { name: "Valor", exact: true }).click();
  const top = await topMarketValue(page);
  await expect(table.locator('tbody tr[data-player] td[data-column-id="value"]').first()).toHaveText(
    await reais(page, top),
  );
  await expect(table.locator('td[data-column-id="value"]', { hasText: "£" })).toHaveCount(0);

  await page.goto("/#/carrinho");
  const budget = page.getByRole("textbox", { name: "Verba de transferências" });
  await expect(budget).toBeVisible(LOADED);
  await budget.fill("R$ 75M");
  await budget.press("Enter");
  await expect(budget).toHaveValue(await reais(page, 10_000_000));
  await expect.poll(async () => Object.values((await savedCart(page)).budgets ?? {})[0]?.transfer).toBe(10_000_000);
  await expect(page.getByRole("region", { name: "Verba da janela" })).toContainText(await reais(page, 10_000_000));
});

test("custom composite appears as column and in scatter axes", async ({ page }) => {
  await page.goto("/#/config/compostas");
  await page.getByRole("button", { name: "Nova composta" }).click();
  await page.getByRole("textbox", { name: "Nome da composta" }).fill("Criador");
  for (const stat of ["xA/90", "KP/90", "CCC/90"]) {
    await page.getByRole("button", { name: "Adicionar stat" }).click();
    await page.getByRole("combobox", { name: "Buscar stat para adicionar" }).fill(stat);
    await page.getByRole("option", { name: new RegExp(`^${stat.replace("/", "\\/")} `) }).click();
  }
  await page.getByRole("button", { name: "Criar composta" }).click();
  await expect(
    page.getByRole("navigation", { name: "Compostas" }).getByRole("link", { name: "Criador" }),
  ).toBeVisible();

  await page.goto("/#/scout");
  const table = page.getByRole("table", { name: "Jogadores" });
  await expect(table.locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
  await page.getByRole("button", { name: "Colunas" }).click();
  await page.getByRole("menuitemcheckbox", { name: /^Criador/ }).click();
  await page.keyboard.press("Escape");
  await table.evaluate((t) => (t.parentElement!.scrollLeft = t.parentElement!.scrollWidth));
  await expect(page.getByRole("button", { name: "Criador", exact: true })).toBeVisible();
  await expect(table.locator('tbody tr[data-player] td[data-column-id^="custom-"]').first()).toBeVisible();

  await page.goto("/#/graficos");
  await page.getByRole("button", { name: /^Eixo X:/ }).click(LOADED);
  await page.getByRole("combobox", { name: "Buscar stat do eixo X" }).fill("Criador");
  await page.getByRole("option", { name: /^Criador/ }).click();
  await expect(page.getByRole("button", { name: "Eixo X: Criador" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Gráfico de dispersão" }).getByRole("status")).toContainText(
    /jogadores com [\d.]+\+ min no gráfico/,
  );
});

test("restore defaults resets presets", async ({ page }) => {
  await page.goto("/#/config/compostas");
  const presets = page.getByRole("navigation", { name: "Compostas" });
  await presets.getByRole("link", { name: "Ações ofensivas/90" }).click();
  const editor = page.getByRole("region", { name: "Ações ofensivas/90" });
  const weight = editor.getByRole("textbox", { name: "Peso de npG/90" });
  await weight.fill("5");
  await weight.press("Enter");
  await editor.getByRole("button", { name: "Tirar SoT/90" }).click();
  await expect(editor.getByRole("textbox", { name: "Peso de SoT/90" })).toHaveCount(0);

  await page.reload();
  await presets.getByRole("link", { name: "Ações ofensivas/90" }).click();
  await expect(weight).toHaveValue("5,0");

  await editor.getByRole("button", { name: "Restaurar padrão" }).click();
  await expect(weight).toHaveValue("1,0");
  await expect(editor.getByRole("textbox", { name: "Peso de SoT/90" })).toHaveValue("1,0");

  await weight.fill("3");
  await weight.press("Enter");
  const sections = page.getByRole("navigation", { name: "Seções de Configurações" });
  await sections.getByRole("link", { name: "Geral" }).click();
  await page.getByRole("radio", { name: "Claro" }).click();
  await page.getByRole("button", { name: "Restaurar todos os padrões" }).click();
  const confirm = page.getByRole("dialog", { name: "Restaurar todos os padrões?" });
  await confirm.getByRole("button", { name: "Restaurar padrões" }).click();
  await expect(confirm).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "Escuro" })).toBeChecked();
  await sections.getByRole("link", { name: "Stats compostas" }).click();
  await presets.getByRole("link", { name: "Ações ofensivas/90" }).click();
  await expect(weight).toHaveValue("1,0");
});

declare global {
  interface Window {
    __frames: { dark: boolean; background: string }[];
  }
}

test("light theme paints no dark frame on reload", async ({ page }) => {
  await page.goto("/#/config");
  await page.getByRole("radio", { name: "Claro" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  await page.addInitScript(() => {
    window.__frames = [];
    const record = () => {
      const body = document.body;
      window.__frames.push({
        dark: document.documentElement.classList.contains("dark"),
        background: body ? getComputedStyle(body).backgroundColor : "",
      });
      if (!document.querySelector("main")) requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
  await page.reload();
  await expect(page.getByRole("radio", { name: "Claro" })).toBeChecked();
  const frames = await page.evaluate(() => window.__frames);
  expect(frames.length).toBeGreaterThan(0);
  expect(frames.filter((f) => f.dark)).toEqual([]);

  const lightness = (css: string): number | null => {
    const [first, second, third, alpha = 1] = (css.match(/[\d.]+/g) ?? []).map(Number);
    if (!css || alpha === 0) return null;
    return css.startsWith("oklch") ? first : (first + second + third) / 3 / 255;
  };
  for (const { background } of frames) {
    const l = lightness(background);
    if (l !== null) expect(l, background).toBeGreaterThan(0.6);
  }
});
