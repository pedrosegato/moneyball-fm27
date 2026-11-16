import { describe, expect, it } from "vitest";
import type { PastSeason } from "@/data/types";
import { applyPeriod, isPeriod, pastYears, RECORD_FIELDS, readPeriod, SEASON_FIELDS } from "./period";
import { playerRecord, snapshotOf } from "./testing/records";

const past = (
  year: number,
  starts: number,
  minutes: number,
  goals: number,
  pasAtt: number,
  partial = false,
): PastSeason => ({
  year,
  season: SEASON_FIELDS.map((k) => ({ starts, minutes, goals })[k as "starts" | "minutes" | "goals"] ?? 0),
  record: RECORD_FIELDS.map((k) => (k === "pas_att" ? pasAtt : 0)),
  partial,
});

const player = (pastSeasons: PastSeason[]) => {
  const r = playerRecord({ minutes: 900, season: { starts: 10, goals: 4 } });
  return { ...r, record: { ...r.record, pas_att: 300 }, past_seasons: pastSeasons };
};

describe("periods", () => {
  it("reads and validates the period ids", () => {
    expect(isPeriod("season")).toBe(true);
    expect(isPeriod("games:30")).toBe(true);
    expect(isPeriod("year:2026")).toBe(true);
    expect(isPeriod("games:")).toBe(false);
    expect(isPeriod(30)).toBe(false);
    expect(readPeriod("games:50")).toEqual({ kind: "games", n: 50 });
  });

  it("keeps this season as the game sends it", () => {
    const snapshot = snapshotOf([player([past(2026, 30, 2700, 9, 900)])]);
    expect(applyPeriod(snapshot, "season")).toBe(snapshot);
  });

  it("a past year swaps in that season, and players without it have no minutes", () => {
    const snapshot = snapshotOf([player([past(2026, 30, 2700, 9, 900, true)]), player([])]);
    const [had, none] = applyPeriod(snapshot, "year:2026").players;
    expect(had.season).toMatchObject({ starts: 30, minutes: 2700, goals: 9 });
    expect(had.record.pas_att).toBe(900);
    expect(had.partial_detail).toBe(true);
    expect(had.keeper).toBeNull();
    expect(none.season).toBeNull();
  });

  it("the last N games add the share of the previous season that completes N", () => {
    const snapshot = snapshotOf([player([past(2025, 40, 3600, 40, 4000), past(2026, 20, 1800, 10, 1000)])]);
    const [r] = applyPeriod(snapshot, "games:30").players;
    expect(r.season).toMatchObject({ starts: 30, minutes: 900 + 1800, goals: 4 + 10 });
    expect(r.record.pas_att).toBe(300 + 1000);
    const [longer] = applyPeriod(snapshot, "games:50").players;
    expect(longer.season).toMatchObject({ starts: 50, minutes: 900 + 1800 + 1800, goals: 4 + 10 + 20 });
  });

  it("the last N games scale this season down when it already has more than N games", () => {
    const snapshot = snapshotOf([player([])]);
    const [r] = applyPeriod(snapshot, "games:5").players;
    expect(r.season).toMatchObject({ starts: 5, minutes: 450, goals: 2 });
  });

  it("offers the years of seasons that ended before this one, newest first", () => {
    const snapshot = snapshotOf(
      [player([past(2027, 3, 270, 0, 10), past(2026, 30, 2700, 9, 900)]), player([past(2025, 10, 900, 1, 300)])],
      {
        date: "2027-04-02",
      },
    );
    expect(pastYears(snapshot)).toEqual([2026, 2025]);
  });
});
