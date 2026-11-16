import { expect, type Page, test } from "@playwright/test";

const LOADED = { timeout: 60_000 };

interface ServedPlayer {
  uid: number;
  name: string;
  club: string | null;
  club_uid: number | null;
  owner: string | null;
  owner_uid: number | null;
  value: number;
  wage: number | null;
  pos: number[];
}

interface Served {
  myClub: number;
  players: ServedPlayer[];
}

let served: Served | null = null;

async function servedSnapshot(page: Page): Promise<Served> {
  if (!served) {
    const snapshot = (await (await page.request.get("/__dev/snapshot")).json()) as {
      my_clubs: { uid: number | null }[];
      players: ServedPlayer[];
    };
    served = { myClub: snapshot.my_clubs.find((c) => c.uid !== null)!.uid!, players: snapshot.players };
  }
  return served;
}

const POS = ["GK", "SW", "DL", "DC", "DR", "DM", "ML", "MC", "MR", "AML", "AMC", "AMR", "ST", "WBL", "WBR"] as const;
const NATURAL = 18;
const naturalOf = (p: ServedPlayer) => POS.filter((_, i) => (p.pos[i] ?? 0) >= NATURAL);
const contracted = (p: ServedPlayer, club: number) => (p.club_uid === club && !p.owner) || p.owner_uid === club;
const valued = (p: ServedPlayer) => p.value > 0 && p.value !== 300_000_000 && p.value !== 0xffff_ffff;

async function pickMoves(page: Page) {
  const { myClub, players } = await servedSnapshot(page);
  const names = new Map<string, number>();
  for (const p of players) names.set(p.name, (names.get(p.name) ?? 0) + 1);
  const target = (p: ServedPlayer) =>
    !contracted(p, myClub) &&
    p.club_uid !== myClub &&
    valued(p) &&
    names.get(p.name) === 1 &&
    p.club &&
    naturalOf(p).length;
  const first = players.find((p) => target(p) && naturalOf(p).includes("ST"))!;
  const second = players.find((p) => target(p) && naturalOf(p).includes("DC") && !naturalOf(p).includes("ST"))!;
  const sale = players.find((p) => contracted(p, myClub) && p.club_uid === myClub && valued(p))!;
  expect(first && second && sale).toBeTruthy();
  return { myClub, players, buys: [first, second], sale };
}

const pounds = (page: Page, values: number[]) =>
  page.evaluate(async (vs) => {
    const load = (path: string) => import(path);
    const { formatMoney, POUNDS } = await load("/src/lib/money.ts");
    return vs.map((v: number) => formatMoney(v, POUNDS) as string);
  }, values);

async function buyFromPanel(page: Page, player: ServedPlayer) {
  await page.goto("/#/scout");
  const table = page.getByRole("table", { name: "Jogadores" });
  await expect(table.locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
  await page.getByRole("searchbox", { name: "Buscar nesta lista" }).fill(player.name);
  await table.locator(`tbody tr[data-player="${player.uid}"] th`).click();
  const sheet = page.getByRole("dialog", { name: player.name });
  await sheet.getByRole("button", { name: "Carrinho" }).click();
  await expect(sheet.getByRole("button", { name: "Carrinho" })).toHaveAttribute("aria-pressed", "true");
}

const transfers = (page: Page) =>
  page.getByRole("complementary", { name: "Verba e vagas" }).getByRole("region", { name: "Transferências" });
const wages = (page: Page) =>
  page.getByRole("complementary", { name: "Verba e vagas" }).getByRole("region", { name: "Salários" });

async function openCart(page: Page) {
  await page.goto("/#/carrinho");
  await expect(page.getByRole("complementary", { name: "Verba e vagas" })).toBeVisible(LOADED);
}

test.beforeEach(async ({ page }) => {
  for (const url of ["**/__dev/status", "**/__dev/snapshot"]) {
    await page.route(url, async (route) => {
      const response = await route.fetch();
      const { money: _money, ...body } = await response.json();
      await route.fulfill({ response, json: body });
    });
  }
});

test("add 2 buys + 1 sale updates bar and pitch", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const { myClub, players, buys, sale } = await pickMoves(page);
  for (const buy of buys) await buyFromPanel(page, buy);

  await page.goto("/#/elenco");
  const squad = page.getByRole("table", { name: "Jogadores" });
  await expect(squad.locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
  await squad.locator(`tbody tr[data-player="${sale.uid}"]`).getByRole("checkbox").click();
  await page.getByRole("toolbar", { name: "Seleção" }).getByRole("button", { name: "Vender" }).click();

  await openCart(page);
  const cart = page.getByRole("table", { name: "Jogadores" });
  const line = (p: ServedPlayer) => cart.locator(`tbody tr[data-player="${p.uid}"]`);
  for (const buy of buys) {
    await expect(line(buy).locator('[data-column-id="cartKind"]')).toHaveText("Compra");
    await expect(line(buy).locator('[data-column-id="cartStatus"]')).toHaveText("Previsto");
  }
  await expect(line(sale).locator('[data-column-id="cartKind"]')).toHaveText("Venda");
  await expect(line(sale).locator('[data-column-id="cartStatus"]')).toHaveText("Previsto");

  await expect(transfers(page)).toContainText("Sem verba definida");
  const bill = players.filter((p) => contracted(p, myClub)).reduce((t, p) => t + (p.wage ?? 0), 0);
  const cap = bill + 1_000_000;
  await page.getByRole("textbox", { name: "Verba de transferências" }).fill("£80M");
  await page.getByRole("textbox", { name: "Verba de transferências" }).press("Enter");
  await page.getByRole("textbox", { name: "Teto salarial por semana" }).fill(String(cap));
  await page.getByRole("textbox", { name: "Teto salarial por semana" }).press("Enter");

  const fee = (p: ServedPlayer) => p.value;
  const transferLeft = 80_000_000 - fee(buys[0]) - fee(buys[1]) + fee(sale);
  const wageLeft = cap - bill - (buys[0].wage ?? 0) - (buys[1].wage ?? 0) + (sale.wage ?? 0);
  const [transferText, wageText] = await pounds(page, [transferLeft, wageLeft]);
  await expect(transfers(page)).toContainText(
    `Restante ${transferText} (${Math.round((transferLeft / 80_000_000) * 100)}%)`,
  );
  await expect(wages(page)).toContainText(`Restante ${wageText} (${Math.round((wageLeft / cap) * 100)}%)`);
  await expect(page.getByRole("region", { name: "Verba da janela" })).toContainText(`Restante ${transferText}`);

  const pitch = page.getByRole("list", { name: "Chegadas por posição" });
  const counts = new Map<string, number>();
  for (const buy of buys) for (const p of naturalOf(buy)) counts.set(p, (counts.get(p) ?? 0) + 1);
  for (const [pos, n] of counts)
    await expect(pitch.getByLabel(new RegExp(`\\(${pos}\\): ${n} jogador`))).toContainText(String(n));
  await expect(pitch.getByLabel("Goleiro (GK): nenhum jogador")).toBeVisible();

  const feeField = line(buys[0]).getByRole("textbox", { name: `Taxa de ${buys[0].name}` });
  await feeField.fill("£200M");
  await feeField.press("Enter");
  await expect(transfers(page)).toContainText("Estourou");
  await expect(transfers(page)).toContainText("Nada fica bloqueado");
  await expect(feeField).toBeEditable();
});

test("manual budget persists per save", async ({ page }) => {
  test.setTimeout(180_000);
  const { myClub } = await servedSnapshot(page);
  await page.goto("/#/carrinho");
  await page.evaluate(() =>
    localStorage.setItem(
      "moneyball-fm27:v1:cart",
      JSON.stringify({ items: [], budgets: { "1": { transfer: 99_000_000, wageWeekly: null } } }),
    ),
  );
  await page.reload();
  await expect(page.getByRole("complementary", { name: "Verba e vagas" })).toBeVisible(LOADED);
  await expect(transfers(page)).toContainText("Sem verba definida");

  const field = page.getByRole("textbox", { name: "Verba de transferências" });
  await field.fill("24M");
  await field.press("Enter");
  await expect(field).toHaveValue("£24,0M");
  await expect
    .poll(
      async () =>
        JSON.parse((await page.evaluate(() => localStorage.getItem("moneyball-fm27:v1:cart"))) ?? "{}").budgets,
    )
    .toEqual({
      "1": { transfer: 99_000_000, wageWeekly: null },
      [String(myClub)]: { transfer: 24_000_000, wageWeekly: null },
    });

  await page.reload();
  await expect(page.getByRole("complementary", { name: "Verba e vagas" })).toBeVisible(LOADED);
  await expect(page.getByRole("textbox", { name: "Verba de transferências" })).toHaveValue("£24,0M");
  await expect(transfers(page)).toContainText("Restante £24,0M (100%)");
});

test("two rows selected show the floating bar, and Tirar do carrinho takes their moves out", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const { buys } = await pickMoves(page);
  for (const buy of buys) await buyFromPanel(page, buy);
  await openCart(page);
  const cart = page.getByRole("table", { name: "Jogadores" });
  for (const buy of buys) await cart.locator(`tbody tr[data-player="${buy.uid}"]`).getByRole("checkbox").click();
  const bar = page.getByRole("toolbar", { name: "Seleção" });
  await expect(bar).toContainText("2 selecionados");
  await expect(bar.getByRole("button")).toHaveText([
    "Tirar do carrinho",
    "Shortlist",
    "Comparar",
    "Abrir perfil",
    "Limpar",
  ]);
  await bar.getByRole("button", { name: "Tirar do carrinho" }).click();
  await expect(page.getByRole("heading", { name: "Carrinho vazio" })).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "Carrinho" })).toBeVisible();
});
