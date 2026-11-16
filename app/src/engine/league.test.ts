import { describe, expect, it } from "vitest";
import { LALIAS, LEAGUES } from "./data/leagues";
import { leagueKey, leagueMatcher, leagueRank, TOP5_LEAGUES } from "./league";

describe("league data", () => {
  it("keeps the old ranking table and aliases whole", () => {
    expect(LEAGUES).toHaveLength(500);
    expect(LEAGUES[0]).toBe("Premier League");
    expect(LEAGUES.at(-1)).toBe("Austrian Level 6");
    expect(Object.keys(LALIAS)).toHaveLength(147);
    expect(LALIAS["Albanian Superleague"]).toBe("Abissnet Superiore");
  });
});

describe("leagueKey", () => {
  it("lower-cases and trims a division", () => {
    expect(leagueKey("  Premier League ")).toBe("premier league");
    expect(leagueKey(null)).toBe("");
  });

  it("maps the game's generic names onto the ranking table's", () => {
    expect(leagueKey("Albanian Superleague")).toBe("abissnet superiore");
  });
});

describe("leagueRank", () => {
  it("ranks by the table order", () => {
    expect(leagueRank("premier league")).toBe(0);
    expect(leagueRank(leagueKey("Brasileirão Assaí Série A"))).toBe(6);
  });

  it("gives a league outside the table no rank", () => {
    expect(leagueRank("nowhere league")).toBeUndefined();
  });

  it("keeps the first of a name listed twice", () => {
    const seen = new Map<string, number>();
    LEAGUES.forEach((name, i) => {
      const k = name.trim().toLowerCase();
      if (!seen.has(k)) seen.set(k, i);
    });
    for (const [k, i] of seen) expect(leagueRank(k)).toBe(i);
    expect(seen.size).toBe(498);
  });
});

describe("leagueMatcher", () => {
  const my = leagueKey("Sky Bet Championship");

  it("any league passes everyone", () => {
    expect(leagueMatcher({ kind: "any" }, my)("Whatever")).toBe(true);
  });

  it("top 5 takes the five big leagues", () => {
    const top5 = leagueMatcher({ kind: "top5" }, my);
    expect(TOP5_LEAGUES).toHaveLength(5);
    expect(top5("Bundesliga")).toBe(true);
    expect(top5("Sky Bet Championship")).toBe(false);
  });

  it("my league or stronger goes by the ranking, and an unranked league counts as weaker", () => {
    const ge = leagueMatcher({ kind: "myLeagueOrStronger" }, my);
    expect(ge("Premier League")).toBe(true);
    expect(ge("Sky Bet Championship")).toBe(true);
    expect(ge("Sky Bet League One")).toBe(false);
    expect(ge("Nowhere League")).toBe(false);
  });

  it("without a club league, my league or stronger passes everyone", () => {
    expect(leagueMatcher({ kind: "myLeagueOrStronger" }, null)("Nowhere League")).toBe(true);
  });

  it("my league and one league match one key", () => {
    expect(leagueMatcher({ kind: "myLeague" }, my)("Sky Bet Championship")).toBe(true);
    expect(leagueMatcher({ kind: "myLeague" }, my)("Premier League")).toBe(false);
    expect(leagueMatcher({ kind: "league", key: "premier league" }, my)("Premier League")).toBe(true);
  });
});
