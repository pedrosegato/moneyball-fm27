import { describe, expect, it } from "vitest";
import {
  belongsTo,
  clubLeague,
  contractedTo,
  hasFoot,
  marketValue,
  minutesOf,
  monthsLeft,
  playsFor,
  sampleSizes,
  seniorFlags,
} from "./club";
import { playerRecord } from "./testing/records";

const MY = 77;

describe("minutesOf / marketValue", () => {
  it("counts no season as 0 minutes", () => {
    expect(minutesOf(playerRecord({ minutes: 0 }))).toBe(0);
    expect(minutesOf(playerRecord({ minutes: 950 }))).toBe(950);
  });

  it("treats the game's 0 and £300M placeholders as no value", () => {
    expect(marketValue(playerRecord({ value: 1_250_000 }))).toBe(1_250_000);
    expect(marketValue(playerRecord({ value: 0 }))).toBeNaN();
    expect(marketValue(playerRecord({ value: 300_000_000 }))).toBeNaN();
  });

  it("treats the reader's 0xFFFFFFFF (an unset u32) as no value", () => {
    expect(marketValue(playerRecord({ value: 4_294_967_295 }))).toBeNaN();
    expect(marketValue(playerRecord({ value: 289_575_008 }))).toBe(289_575_008);
  });
});

describe("seniorFlags", () => {
  it("keeps only senior teams when the data names teams", () => {
    const flags = seniorFlags([
      playerRecord({ team: "Senior Team" }),
      playerRecord({ team: "U21" }),
      playerRecord({ team: null }),
    ]);
    expect(Array.from(flags)).toEqual([1, 0, 0]);
  });

  it("counts everyone as senior when no team is named", () => {
    expect(Array.from(seniorFlags([playerRecord({ team: null }), playerRecord({ team: "" })]))).toEqual([1, 1]);
  });
});

describe("club membership", () => {
  const atClub = playerRecord({ club_uid: MY });
  const loanedIn = playerRecord({ club_uid: MY, owner: "Dono", owner_uid: 5 });
  const loanedOut = playerRecord({ club_uid: 5, owner: "Nós", owner_uid: MY });
  const elsewhere = playerRecord({ club_uid: 5 });

  it("playsFor is the club he plays at now, loanees in included", () => {
    expect([atClub, loanedIn, loanedOut, elsewhere].map((r) => playsFor(r, MY))).toEqual([true, true, false, false]);
  });

  it("belongsTo adds the players the club has loaned out", () => {
    expect([atClub, loanedIn, loanedOut, elsewhere].map((r) => belongsTo(r, MY))).toEqual([true, true, true, false]);
  });

  it("contractedTo leaves out loanees in", () => {
    expect([atClub, loanedIn, loanedOut, elsewhere].map((r) => contractedTo(r, MY))).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });

  it("no club means nobody", () => {
    expect([playsFor(atClub, null), belongsTo(atClub, null), contractedTo(atClub, null)]).toEqual([
      false,
      false,
      false,
    ]);
  });
});

describe("clubLeague", () => {
  it("is the most common league of the club's own players, loanees in left out", () => {
    const records = [
      playerRecord({ club_uid: MY, division: "Sky Bet Championship" }),
      playerRecord({ club_uid: MY, division: "Premier League" }),
      playerRecord({ club_uid: MY, division: "Premier League" }),
      playerRecord({ club_uid: MY, owner: "Dono", owner_uid: 5, division: "Bundesliga" }),
      playerRecord({ club_uid: MY, owner: "Dono", owner_uid: 5, division: "Bundesliga" }),
      playerRecord({ club_uid: MY, owner: "Dono", owner_uid: 5, division: "Bundesliga" }),
    ];
    expect(clubLeague(records, MY)).toBe("premier league");
  });

  it("breaks a tie by the first league seen", () => {
    const records = [
      playerRecord({ club_uid: MY, division: "Sky Bet Championship" }),
      playerRecord({ club_uid: MY, division: "Premier League" }),
    ];
    expect(clubLeague(records, MY)).toBe("sky bet championship");
    expect(clubLeague(records, null)).toBeNull();
    expect(clubLeague([playerRecord({ club_uid: MY, division: null })], MY)).toBeNull();
  });
});

describe("monthsLeft", () => {
  it("counts whole calendar months from the in-game date", () => {
    expect(monthsLeft(playerRecord({ contract_end: "2027-06-30" }), "2026-10-30")).toBe(8);
    expect(monthsLeft(playerRecord({ contract_end: "2026-10-31" }), "2026-10-30")).toBe(0);
    expect(monthsLeft(playerRecord({ contract_end: "2026-06-30" }), "2026-10-30")).toBe(-4);
  });

  it("reads a contract that ran out earlier this month as over, not as ending this month", () => {
    expect(monthsLeft(playerRecord({ contract_end: "2026-10-01" }), "2026-10-30")).toBe(-1);
    expect(monthsLeft(playerRecord({ contract_end: "2026-10-30" }), "2026-10-30")).toBe(0);
  });

  it("is unknown without a contract end or a game date", () => {
    expect(monthsLeft(playerRecord({ contract_end: null }), "2026-10-30")).toBeNaN();
    expect(monthsLeft(playerRecord({ contract_end: "2027-06-30" }), null)).toBeNaN();
  });
});

describe("hasFoot", () => {
  it("matches the start of the preferred foot, and an empty filter matches all", () => {
    expect(hasFoot(playerRecord({ foot: "Left" }), "left")).toBe(true);
    expect(hasFoot(playerRecord({ foot: "Either" }), "Left")).toBe(false);
    expect(hasFoot(playerRecord({ foot: "Right" }), "")).toBe(true);
  });
});

describe("sampleSizes", () => {
  it("counts 1800 minutes, 20 full games, as a full sample in every league and at any point of the season", () => {
    const players = [
      playerRecord({ division: "Liga Cedo", minutes: 1047 }),
      playerRecord({ division: "Liga Cheia", minutes: 3000 }),
      playerRecord({ division: "", minutes: 0 }),
    ];
    const { minutes, full } = sampleSizes(players);
    expect(Array.from(minutes)).toEqual([1047, 3000, 0]);
    expect(Array.from(full)).toEqual([1800, 1800, 1800]);
  });
});
