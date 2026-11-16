import { expect, type Locator, type Page, test } from "@playwright/test";

const LOADED = { timeout: 60_000 };

const pitch = (page: Page, name = "Posições do XI") => page.getByRole("radiogroup", { name, exact: true });
const card = (page: Page, name: RegExp) => pitch(page).getByRole("radio", { name });
const view = (page: Page, name: string) =>
  page.getByRole("radiogroup", { name: "Visão do campo" }).getByRole("radio", { name, exact: true });
const backToGame = (page: Page) => page.getByRole("button", { name: "Voltar à tática do jogo" });

interface Spot {
  row: number;
  col: number;
}

interface Starter {
  slot: number;
  uid: number;
  name: string;
  number: number | null;
  ipShort: string;
  ip: Spot;
  oop: Spot;
}

interface GameTactic {
  starters: Starter[];
  stRating: Record<number, number>;
}

async function open(page: Page) {
  await page.goto("/#/elenco");
  await expect(pitch(page).getByRole("radio").first()).toBeVisible(LOADED);
}

async function gameTactic(page: Page): Promise<GameTactic | null> {
  return page.evaluate(async () => {
    const load = (path: string) => import(path);
    const shape = await load("/src/engine/tacticShape.ts");
    const { roleById } = await load("/src/engine/roles/catalog.ts");
    const snapshot = await (await fetch("/__dev/snapshot")).json();
    if (!snapshot.tactic) return null;
    const slots = shape.shapeFromTactic(snapshot.tactic);
    if (!slots) return null;
    const byUid = new Map(snapshot.players.map((p: { uid: number }) => [p.uid, p] as const)) as Map<
      number,
      { uid: number; name: string; squad_number?: number | null; pos: number[] }
    >;
    const players: (number | null)[] = snapshot.tactic.slots.map((s: { playerId: number | null }) => s.playerId);
    const starters = slots.flatMap(
      (
        s: { ip: { position: string; side: string; roleId: string }; oop: { position: string; side: string } },
        slot: number,
      ) => {
        const uid = players[slot];
        const p = uid === null ? undefined : byUid.get(uid);
        if (!p) return [];
        return [
          {
            slot,
            uid: p.uid,
            name: p.name,
            number: p.squad_number ?? null,
            ipShort: roleById(s.ip.roleId).shortName,
            ip: shape.spotOf(s.ip),
            oop: shape.spotOf(s.oop),
          },
        ];
      },
    );
    const stRating = Object.fromEntries(
      starters.map((s: { uid: number }) => [s.uid, shape.positionRating(byUid.get(s.uid)!.pos, "ST")]),
    );
    return { starters, stRating };
  });
}

const spotKey = ({ row, col }: Spot) => `${row},${col}`;
const sameSpot = (a: Spot, b: Spot) => a.row === b.row && a.col === b.col;
const cardOf = (page: Page, name: string) => card(page, new RegExp(`: ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));

async function drag(page: Page, from: Locator, to: Locator, drop = true) {
  const start = (await from.boundingBox())!;
  const end = (await to.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x + start.width / 2 + 12, start.y + start.height / 2 + 12, { steps: 4 });
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 14 });
  if (drop) await page.mouse.up();
}

const fits = (page: Page) =>
  page.evaluate(() => [
    document.scrollingElement!.scrollHeight - innerHeight,
    document.scrollingElement!.scrollWidth - innerWidth,
  ]);

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 990 });
});

test("the pitch opens on the game's tactic, with numbers, roles and scores", async ({ page }) => {
  await open(page);
  const tactic = await gameTactic(page);
  test.skip(!tactic, "the dev snapshot has no tactic");
  expect(tactic!.starters.length).toBeGreaterThan(8);
  for (const s of tactic!.starters) await expect(cardOf(page, s.name)).toHaveCount(1);
  const numbered = tactic!.starters.find((s) => s.number !== null)!;
  const one = cardOf(page, numbered.name);
  await expect(one.locator('[data-slot="shirt-number"]')).toHaveText(String(numbered.number));
  await expect(one.locator("[data-role]").first()).toHaveText(numbered.ipShort);
  await expect(one.locator('[data-slot="stat-cell"]').first()).toBeVisible();
  await expect(page.getByText("Tática do jogo", { exact: true })).toBeVisible();
});

test("Sem Posse de Bola and Ambos follow the out-of-possession shape", async ({ page }) => {
  await open(page);
  const tactic = await gameTactic(page);
  test.skip(!tactic, "the dev snapshot has no tactic");
  const moving = tactic!.starters.filter((s) => !sameSpot(s.ip, s.oop));
  test.skip(moving.length === 0, "every slot keeps its spot without the ball");
  const first = moving[0];

  await view(page, "Sem Posse de Bola").click();
  await expect(cardOf(page, first.name)).toHaveAttribute("data-spot", spotKey(first.oop));

  await view(page, "Ambos").click();
  await expect(cardOf(page, first.name)).toHaveAttribute("data-spot", spotKey(first.ip));
  await expect(pitch(page).locator("[data-shape-link]")).toHaveCount(moving.length);
});

test("Panorâmico shows both shapes side by side", async ({ page }) => {
  await open(page);
  const tactic = await gameTactic(page);
  test.skip(!tactic, "the dev snapshot has no tactic");
  await view(page, "Panorâmico").click();
  const withBall = pitch(page, "Posições do XI com bola");
  const withoutBall = pitch(page, "Posições do XI sem bola");
  await expect(withBall.getByRole("radio")).toHaveCount(11);
  await expect(withoutBall.getByRole("radio")).toHaveCount(11);
  const left = (await withBall.boundingBox())!;
  const right = (await withoutBall.boundingBox())!;
  expect(right.x).toBeGreaterThan(left.x + left.width - 1);
});

test("dragging a card to a free position moves it, survives a reload, and Voltar undoes it", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page);
  const tactic = await gameTactic(page);
  test.skip(!tactic, "the dev snapshot has no tactic");
  const striker = card(page, /^Atacante \(ST\)/);
  const home = await striker.getAttribute("data-spot");
  const free = pitch(page).locator('[data-free-spot][data-spot="1,2"]');
  await expect(free).toHaveCount(1);

  await drag(page, striker, free);
  const moved = card(page, /^Atacante \(ST\)/);
  await expect(moved).toHaveAttribute("data-spot", "1,2");

  await page.reload();
  await expect(card(page, /^Atacante \(ST\)/)).toHaveAttribute("data-spot", "1,2", LOADED);

  await backToGame(page).click();
  await expect(card(page, /^Atacante \(ST\)/)).toHaveAttribute("data-spot", home!);
  await expect(backToGame(page)).toHaveCount(0);
});

test("slots turn green or red under a dragged player by his position rating", async ({ page }) => {
  await open(page);
  const tactic = await gameTactic(page);
  test.skip(!tactic, "the dev snapshot has no tactic");
  const backs = tactic!.starters.filter((s) => s.ip.row === 5 && s.ip.col >= 2 && s.ip.col <= 4);
  test.skip(backs.length < 2, "the tactic has fewer than two centre-backs");
  const [from, other] = backs;

  await drag(page, cardOf(page, from.name), cardOf(page, other.name), false);
  await expect(cardOf(page, other.name)).toHaveAttribute("data-fit", "good");

  const st = card(page, /^Atacante \(ST\)/);
  const box = (await st.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
  const expected = tactic!.stRating[from.uid] >= 15 ? "good" : "poor";
  await expect(st).toHaveAttribute("data-fit", expected);
  await page.keyboard.press("Escape");
  await page.mouse.up();
});

test("the head's role picker changes the slot's role", async ({ page }) => {
  await open(page);
  const tactic = await gameTactic(page);
  test.skip(!tactic, "the dev snapshot has no tactic");
  const back = tactic!.starters.find((s) => s.ip.row === 5 && s.ip.col >= 2 && s.ip.col <= 4);
  test.skip(!back, "the tactic has no centre-back");
  const target = cardOf(page, back!.name);
  await target.click();
  await page.getByRole("button", { name: /^Função com bola: .*\. Trocar$/ }).click();
  await page.getByRole("menuitemradio", { name: /^Central Pragmático/ }).click();
  await expect(cardOf(page, back!.name).locator('[data-role="ip:29"]')).toHaveCount(1);

  await backToGame(page).click();
  await expect(cardOf(page, back!.name).locator('[data-role="ip:29"]')).toHaveCount(0);
});

test("no page scroll at 1280 × 800 in each view, with and without the player panel", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page);
  for (const name of ["Panorâmico", "Com Posse de Bola", "Sem Posse de Bola", "Ambos"]) {
    await view(page, name).click();
    await expect(view(page, name)).toHaveAttribute("aria-checked", "true");
    expect(await fits(page), `${name} without the panel`).toEqual([0, 0]);
  }
  await page.getByRole("table", { name: "Jogadores" }).locator("tbody tr[data-player] th").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  for (const name of ["Panorâmico", "Com Posse de Bola", "Sem Posse de Bola", "Ambos"]) {
    await view(page, name).click();
    expect(await fits(page), `${name} with the panel`).toEqual([0, 0]);
  }
});
