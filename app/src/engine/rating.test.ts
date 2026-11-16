import { describe, expect, it } from "vitest";
import { averageRating } from "./rating";
import { playerRecord } from "./testing/records";

describe("averageRating", () => {
  it("is the rating sum over ten times the rated games", () => {
    expect(averageRating(playerRecord({ season: { rating_sum: 712, rated: 10 } }))).toBeCloseTo(7.12, 12);
    expect(averageRating(playerRecord({ season: { rated: 0 } }))).toBeNaN();
    expect(averageRating(playerRecord({ minutes: 0 }))).toBeNaN();
  });
});
