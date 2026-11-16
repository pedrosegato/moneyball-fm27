import { expect, type Locator, type Page, test } from "@playwright/test";

const LOADED = { timeout: 60_000 };

const VERDICT_LABEL: Record<string, string> = {
  keep: "Manter",
  renew: "Renovar",
  sellHigh: "Vender em alta",
  sellNow: "Vender já",
  surplus: "Excedente",
  sellBeforeDecline: "Vender antes da queda",
  develop: "Desenvolver",
  loanOut: "Emprestar",
  release: "Dispensar",
  notEnoughData: "Poucos dados",
};
const FIT_LABEL: Record<string, string> = { upgrade: "Melhor", replacement: "Equivalente", downgrade: "Pior" };

const table = (page: Page) => page.getByRole("table", { name: "Jogadores" });
const status = (page: Page) => page.getByRole("region", { name: "Tabela de jogadores" }).getByRole("status");
const pitch = (page: Page) => page.getByRole("radiogroup", { name: "Posições do XI" });
const card = (page: Page, name: RegExp) => pitch(page).getByRole("radio", { name });
const verdicts = (page: Page) => page.getByRole("radiogroup", { name: "Veredito" });
const row = (page: Page, uid: number) => table(page).locator(`tbody tr[data-player="${uid}"]`);
const tab = (page: Page, name: RegExp) => page.getByRole("tab", { name });
const storage = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(`moneyball-fm27:v1:${k}`), key);

async function open(page: Page) {
  await page.goto("/#/elenco");
  await expect(pitch(page).getByRole("radio").first()).toBeVisible(LOADED);
  await expect(table(page).locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
}

async function openSignings(page: Page) {
  await tab(page, /^Contratações/).click();
  await expect(tab(page, /^Contratações/)).toHaveAttribute("aria-selected", "true");
}

interface EnginePlayer {
  uid: number;
  name: string;
  minutes: number;
  contracted: boolean;
  atClub: boolean;
  team: string | null;
  verdict: string | null;
  fee: number;
  wage: number;
}

interface EngineElenco {
  slots: string[];
  xi: (number | null)[];
  candidates: { uid: number; verdict: string | null }[][];
  squad: EnginePlayer[];
}

async function engineElenco(page: Page): Promise<EngineElenco> {
  return page.evaluate(async () => {
    const load = (path: string) => import(path);
    const { DEFAULT_ENGINE_SETTINGS } = await load("/src/engine/analysis/input.ts");
    const { prepareSnapshot } = await load("/src/engine/analysis/prepare.ts");
    const { analyzeModel } = await load("/src/engine/analysis/model.ts");
    const { scorePlayers } = await load("/src/engine/analysis/score.ts");
    const club = await load("/src/engine/club.ts");
    const { lineupFor } = await load("/src/store/fit.ts");
    const snapshot = await (await fetch("/__dev/snapshot")).json();
    const prepared = prepareSnapshot(snapshot);
    const settings = DEFAULT_ENGINE_SETTINGS;
    const myClubUid: number = snapshot.my_clubs.find((c: { uid: number | null }) => c.uid !== null).uid;
    const model = analyzeModel(prepared, {
      poolMinutes: settings.poolMinutes,
      leagueAdjustment: settings.leagueAdjustment,
      myClubUid,
    });
    const { lineup, fit, sellKeep } = scorePlayers(prepared, model, {
      myClubUid,
      settings,
      lineup: lineupFor({ lineups: {} }, myClubUid, snapshot.tactic ?? null),
    });
    const uid = (i: number) => snapshot.players[i].uid as number;
    return {
      slots: [...lineup.slots],
      xi: lineup.xi.map((i: number | null) => (i === null ? null : uid(i))),
      candidates: fit.map((rows: { index: number; verdict: string | null }[]) =>
        rows.map((r) => ({ uid: uid(r.index), verdict: r.verdict })),
      ),
      squad: snapshot.players
        .filter((p: { club_uid: number; owner_uid: number }) => club.belongsTo(p, myClubUid))
        .map(
          (p: {
            uid: number;
            name: string;
            club_uid: number;
            owner_uid: number;
            team: string;
            owner_team: string;
            wage: number;
          }) => {
            const value = club.marketValue(p);
            return {
              uid: p.uid,
              name: p.name,
              minutes: club.minutesOf(p),
              contracted: club.contractedTo(p, myClubUid),
              atClub: club.playsFor(p, myClubUid),
              team: p.owner_uid === myClubUid ? p.owner_team : p.team,
              verdict: sellKeep[p.uid]?.verdict ?? null,
              fee: Number.isNaN(value) ? 0 : value,
              wage: p.wage ?? 0,
            };
          },
        ),
    };
  });
}

async function verdictCounts(page: Page, labels: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const label of labels) {
    const name =
      (await verdicts(page)
        .getByRole("radio", { name: new RegExp(`^${label} `) })
        .getAttribute("aria-label")) ?? "";
    out[label] = Number(/(\d+)$/.exec(name)?.[1]);
  }
  return out;
}

async function drag(page: Page, from: Locator, to: Locator | { x: number; y: number }, drop = true) {
  const start = (await from.boundingBox())!;
  const end = "x" in to ? to : centre((await to.boundingBox())!);
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x + start.width / 2 + 12, start.y + start.height / 2 + 12, { steps: 4 });
  await page.mouse.move(end.x, end.y, { steps: 14 });
  if (drop) await page.mouse.up();
}

const centre = (b: { x: number; y: number; width: number; height: number }) => ({
  x: b.x + b.width / 2,
  y: b.y + b.height / 2,
});

const savedPicks = async (page: Page): Promise<Record<string, number | null>> => {
  const lineups = JSON.parse((await storage(page, "fit")) ?? "{}").lineups ?? {};
  return Object.values<{ picks: Record<string, number | null> }>(lineups)[0]?.picks ?? {};
};

const fits = (page: Page) =>
  page.evaluate(() => [
    document.scrollingElement!.scrollHeight - innerHeight,
    document.scrollingElement!.scrollWidth - innerWidth,
  ]);

test("Meu elenco shows every played MFC player with the engine's verdicts", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 2400 });
  await open(page);
  const { squad } = await engineElenco(page);
  const played = squad.filter((p) => p.contracted && p.minutes > 0);
  expect(played.length).toBeGreaterThan(20);

  await expect(status(page)).toHaveText(`${squad.length} jogadores`);
  await expect(table(page).locator("tbody tr[data-player]")).toHaveCount(squad.length);
  for (const p of played) {
    expect(p.verdict, `${p.name} has a verdict`).not.toBeNull();
    await expect(row(page, p.uid).locator('[data-column-id="sellKeep"] [data-slot="verdict"]'), p.name).toHaveText(
      VERDICT_LABEL[p.verdict!],
    );
  }
  const loanee = squad.find((p) => !p.contracted);
  if (loanee) await expect(row(page, loanee.uid).locator('[data-column-id="sellKeep"]')).toHaveText("—");

  const counts = new Map<string, number>();
  for (const p of squad) if (p.verdict) counts.set(p.verdict, (counts.get(p.verdict) ?? 0) + 1);
  for (const [verdict, n] of counts) {
    await expect(verdicts(page).getByRole("radio", { name: `${VERDICT_LABEL[verdict]} ${n}` })).toBeVisible();
  }
});

test("selecting your own player offers Vender in the floating bar, which adds a sale to the cart", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 2000 });
  await open(page);
  const { squad } = await engineElenco(page);
  const player = squad.find((p) => p.contracted && p.fee > 0)!;
  await expect(table(page).getByRole("button", { name: /^Vender / })).toHaveCount(0);

  await row(page, player.uid).getByRole("checkbox").click();
  const bar = page.getByRole("toolbar", { name: "Seleção" });
  await expect(bar).toContainText("1 selecionado");
  await expect(bar.getByRole("button", { name: /Adicionar ao carrinho/ })).toHaveCount(0);
  const sell = bar.getByRole("button", { name: "Vender" });
  await expect(sell).toHaveAttribute("aria-pressed", "false");

  await sell.click();
  await expect(sell).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("banner").getByRole("link", { name: "Carrinho, 1 item" })).toBeVisible();
  await expect
    .poll(async () => JSON.parse((await storage(page, "cart")) ?? "{}").items)
    .toEqual([{ uid: player.uid, kind: "sell", fee: player.fee, wage: player.wage, name: player.name }]);

  await row(page, player.uid).locator("th").click();
  await expect(page.getByRole("dialog", { name: player.name }).getByRole("button", { name: "Vender" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await sell.click();
  await expect(sell).toHaveAttribute("aria-pressed", "false");
  await expect.poll(async () => JSON.parse((await storage(page, "cart")) ?? "{}").items).toEqual([]);

  const loanee = squad.find((p) => !p.contracted);
  if (loanee) {
    await row(page, loanee.uid).getByRole("checkbox").click();
    await expect(bar.getByRole("button", { name: "Vender (1)" })).toBeVisible();
    await expect(bar.getByRole("button", { name: "Adicionar ao carrinho (1)" })).toBeVisible();
  }
  await page.keyboard.press("Escape");
});

test("the team filter narrows the squad to one team", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 2000 });
  await open(page);
  const { squad } = await engineElenco(page);
  const teams = page.getByRole("radiogroup", { name: "Time" });
  await expect(teams.getByRole("radio", { name: `Todos ${squad.length}` })).toBeChecked();
  const senior = squad.filter((p) => p.team === "Senior Team");
  await teams.getByRole("radio", { name: `Principal ${senior.length}` }).click();
  await expect(status(page)).toHaveText(`${senior.length} de ${squad.length} jogadores`);
  const shown = await table(page)
    .locator("tbody tr[data-player]")
    .evaluateAll((rows) => rows.map((r) => Number((r as HTMLElement).dataset.player)).sort((a, b) => a - b));
  expect(shown).toEqual(senior.map((p) => p.uid).sort((a, b) => a - b));
});

test("Critérios starts closed and edits the Sell/Keep thresholds", async ({ page }) => {
  await open(page);
  const toggle = page.getByRole("button", { name: "Critérios" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  const criteria = page.getByRole("group", { name: "Critérios do Sell/Keep" });
  const field = (name: RegExp) => criteria.getByRole("textbox", { name });
  await expect(field(/^Hab\.\/idade para Desenvolver/)).toHaveValue("100");
  await expect(field(/^Hab\.\/idade para Emprestar/)).toHaveValue("85");
  await expect(field(/^Idade máxima de jovem/)).toHaveValue("23");
  await expect(field(/^Meses de contrato/)).toHaveValue("12");
  await expect(field(/^Razão para Vender em alta/)).toHaveValue("2");
  await expect(field(/^Idade de queda dos jogadores de linha/)).toHaveValue("29");
  await expect(field(/^Idade de queda dos goleiros/)).toHaveValue("33");
  await expect(field(/^Minutos do pool/)).toHaveValue("300");

  const months = field(/^Meses de contrato/);
  await months.fill("24");
  await months.press("Enter");
  await expect.poll(() => storage(page, "settings")).toContain('"contractMonths":24');
  await criteria.getByRole("button", { name: "Restaurar padrões" }).click();
  await expect(months).toHaveValue("12");
});

test("the margin slider changes the verdict counts in Contratações", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page);
  const fit = await engineElenco(page);
  const striker = fit.slots.indexOf("ST(C)");
  const rows = fit.candidates[striker];
  expect(rows.length).toBeGreaterThan(5);

  await card(page, /^Atacante \(ST\)/).click();
  await openSignings(page);
  await expect(status(page)).toHaveText(`${rows.length.toLocaleString("pt-BR")} jogadores`);
  const labels = Object.values(FIT_LABEL);
  const expected = Object.fromEntries(
    Object.entries(FIT_LABEL).map(([v, label]) => [label, rows.filter((r) => r.verdict === v).length]),
  );
  await expect.poll(() => verdictCounts(page, labels)).toEqual(expected);
  expect(expected.Melhor + expected.Pior).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Critérios" }).click();
  const lvl = page.getByRole("slider", { name: "Margem de equivalência" });
  await expect(lvl).toHaveValue("8");
  await lvl.focus();
  await page.keyboard.press("End");
  await expect(lvl).not.toHaveValue("8");
  await expect.poll(async () => (await verdictCounts(page, labels)).Equivalente).toBeGreaterThan(expected.Equivalente);
  const wider = await verdictCounts(page, labels);
  expect(wider.Melhor + wider.Equivalente + wider.Pior).toBe(rows.length);
  await expect.poll(() => storage(page, "settings")).toMatch(/"lvl":(?!8\b)\d+/);
});

test("a slot cleared by Limpar vaga is remembered until Automático", async ({ page }) => {
  await open(page);
  const fit = await engineElenco(page);
  const striker = fit.slots.indexOf("ST(C)");
  expect(fit.xi[striker]).not.toBeNull();

  await card(page, /^Atacante \(ST\)/).click();
  await page.getByRole("button", { name: "Limpar vaga" }).click();
  await expect(card(page, /^Atacante \(ST\): vazio/)).toBeVisible();
  await expect.poll(() => storage(page, "fit")).toContain(`"${striker}":null`);

  await openSignings(page);
  await expect(verdicts(page)).toHaveCount(0);

  await page.reload();
  await expect(card(page, /^Atacante \(ST\): vazio/)).toBeVisible(LOADED);

  const hasTactic = await page.evaluate(async () => Boolean((await (await fetch("/__dev/snapshot")).json()).tactic));
  await page.getByRole("button", { name: hasTactic ? "Voltar à tática do jogo" : "Automático" }).click();
  await expect(card(page, /^Atacante \(ST\): vazio/)).toHaveCount(0);
});

test("a candidate opens the player panel and goes to the cart from the selection's bar", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await open(page);
  const fit = await engineElenco(page);
  const striker = fit.slots.indexOf("ST(C)");
  await card(page, /^Atacante \(ST\)/).click();
  await openSignings(page);
  const best = fit.candidates[striker][0];
  const candidate = row(page, best.uid);
  await expect(candidate).toBeVisible(LOADED);
  const name = (await candidate.locator("th span").first().textContent())!;

  await expect(candidate.getByRole("button", { name: /^Carrinho / })).toHaveCount(0);
  await candidate.getByRole("checkbox", { name: `Selecionar ${name}` }).click();
  const add = page.getByRole("toolbar", { name: "Seleção" }).getByRole("button", { name: "Adicionar ao carrinho" });
  await add.click();
  await expect(add).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  for (const id of ["perf", "fitDiff", "fitStyle"]) {
    await expect(candidate.locator(`[data-column-id="${id}"] [data-slot="stat-cell"]`)).toHaveAttribute(
      "data-tier",
      /.+/,
    );
  }
  await expect
    .poll(async () => JSON.parse((await storage(page, "cart")) ?? "{}").items?.[0])
    .toMatchObject({ uid: best.uid, kind: "buy" });

  await candidate.locator("th").click();
  await expect(page.getByRole("dialog", { name })).toBeVisible();
});

test("drags a squad player onto a slot and the others stay put", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1600, height: 990 });
  await open(page);
  const fit = await engineElenco(page);
  const inXi = new Set(fit.xi);
  const mounted = await table(page)
    .locator("tbody tr[data-player]")
    .evaluateAll((rows) => rows.map((r) => Number((r as HTMLElement).dataset.player)));
  const bench = fit.squad.find((p) => p.atClub && !inXi.has(p.uid) && mounted.includes(p.uid))!;
  expect(bench, "a mounted player at the club outside the XI").toBeTruthy();
  const midfield = fit.slots.indexOf("M(C)");
  expect(midfield).toBeGreaterThanOrEqual(0);

  const target = pitch(page)
    .getByRole("radio", { name: /^Meio-campista \(MC\)/ })
    .first();
  await drag(page, row(page, bench.uid).locator("th span").first(), target);

  await expect.poll(async () => Object.keys(await savedPicks(page)).length).toBe(11);
  const picks = await savedPicks(page);
  const changed = fit.xi.flatMap((uid, s) => (picks[String(s)] === uid ? [] : [s]));
  expect(changed, "only the dropped slot moved").toHaveLength(1);
  expect(fit.slots[changed[0]]).toBe("M(C)");
  expect(picks[String(changed[0])]).toBe(bench.uid);
  await expect(target).toHaveAccessibleName(new RegExp(bench.name.split(" ").pop()!));
});

test("drags a slot off the pitch and the slot reads Vazio", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1600, height: 990 });
  await open(page);
  const fit = await engineElenco(page);
  const striker = fit.slots.indexOf("ST(C)");
  expect(fit.xi[striker]).not.toBeNull();

  const st = card(page, /^Atacante \(ST\)/);
  const panel = (await page.getByRole("tabpanel").boundingBox())!;
  await drag(page, st, centre(panel), false);
  await expect(page.getByText("Sai do XI")).toBeVisible();
  await page.mouse.up();

  await expect(card(page, /^Atacante \(ST\): vazio/)).toBeVisible();
  await expect.poll(() => storage(page, "fit")).toContain(`"${striker}":null`);
  const picks = await savedPicks(page);
  fit.xi.forEach((uid, s) => {
    if (s !== striker) expect(picks[String(s)], `slot ${s}`).toBe(uid);
  });
});

test("a filter in Contratações leaves Meu elenco and the Scout as they were, and survives a reload", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1600, height: 990 });
  await page.goto("/");
  await expect(table(page).locator("tbody tr[data-player]").first()).toBeVisible(LOADED);
  const scoutBefore = await status(page).textContent();

  await open(page);
  const squadBefore = await status(page).textContent();
  await openSignings(page);
  const signingsBefore = await status(page).textContent();

  await table(page).locator('thead [data-column-id="age"]').click({ button: "right" });
  await page.getByRole("menuitem", { name: "Filtrar…" }).click();
  const editor = page.getByRole("dialog");
  const max = editor.getByRole("textbox", { name: "Máximo" });
  await max.fill("22");
  await max.press("Enter");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(status(page)).not.toHaveText(signingsBefore!);
  const signingsAfter = await status(page).textContent();
  await expect.poll(() => storage(page, "filters")).toContain("contratacoes");

  await tab(page, /^Meu elenco/).click();
  await expect(status(page)).toHaveText(squadBefore!);
  await page.goto("/");
  await expect(status(page)).toHaveText(scoutBefore!, LOADED);

  await page.goto("/#/elenco");
  await page.reload();
  await expect(pitch(page).getByRole("radio").first()).toBeVisible(LOADED);
  await openSignings(page);
  await expect(status(page)).toHaveText(signingsAfter!, LOADED);
});

test("no page scroll at 1280 × 800 with and without the player panel, and at 1920 × 1080", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page);
  const fit = await engineElenco(page);
  const box = async (name: RegExp) => (await card(page, name).boundingBox())!;

  const [keeper, striker, left, right] = await Promise.all(
    [/^Goleiro \(GK\)/, /^Atacante \(ST\)/, /^Lateral esquerdo \(DL\)/, /^Lateral direito \(DR\)/].map(box),
  );
  expect(striker.y).toBeLessThan(keeper.y);
  expect(left.x).toBeLessThan(keeper.x);
  expect(right.x).toBeGreaterThan(keeper.x);
  expect(Math.abs(striker.x - keeper.x)).toBeLessThan(2);
  await expect(card(page, /^Goleiro \(GK\)/).locator('[data-slot="stat-cell"]')).toBeVisible();

  await card(page, /^Atacante \(ST\)/).click();
  await expect(card(page, /^Atacante \(ST\)/)).toHaveAttribute("aria-checked", "true");
  await openSignings(page);
  const candidates = fit.candidates[fit.slots.indexOf("ST(C)")].length;
  await expect(status(page)).toHaveText(`${candidates.toLocaleString("pt-BR")} jogadores`);
  await expect(table(page).locator("tbody tr[data-player]").nth(3)).toBeInViewport();
  expect(await fits(page)).toEqual([0, 0]);

  await table(page).locator("tbody tr[data-player] th").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await fits(page)).toEqual([0, 0]);
  await expect(table(page).locator("tbody tr[data-player]").first()).toBeInViewport();

  await tab(page, /^Meu elenco/).click();
  expect(await fits(page)).toEqual([0, 0]);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await fits(page)).toEqual([0, 0]);
  const width = (await pitch(page).boundingBox())!.width;
  expect(width).toBeLessThanOrEqual(34 * 16 + 1);
});
