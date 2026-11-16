import { POS_GROUPS } from "@/engine/positions";
import { STATS } from "@/engine/stats/catalog";
import { columnPresetFor, defaultColumnsFor, IDENTITY_DEFAULTS, presetKeyOf } from "./presets";

const STAT_KEYS = new Set(STATS.map((d) => d.key));

describe("columnPresetFor", () => {
  it("maps the Atacante columns to catalog keys, then Performance", () => {
    expect(columnPresetFor("ATA")).toEqual([
      "G/90",
      "npxG/90",
      "Shots/90",
      "SoT/90",
      "SoT%",
      "Conv%",
      "xG/Shot",
      "xG-OP",
      "xA/90",
      "perf",
      "perfRole",
    ]);
  });

  it("maps the Zagueiro, Meio and Goleiro columns", () => {
    expect(columnPresetFor("ZAG")).toEqual([
      "TckWon/90",
      "Tck%",
      "KTck/90",
      "Int/90",
      "Clr/90",
      "Blk/90",
      "HdrWon/90",
      "Hdr%",
      "Fouls/90",
      "Pas%",
      "perf",
      "perfRole",
    ]);
    expect(columnPresetFor("MC")).toEqual([
      "PsC/90",
      "Pas%",
      "PrPass/90",
      "KP/90",
      "PossLost/90",
      "PossWon/90",
      "Int/90",
      "Drb/90",
      "perf",
      "perfRole",
    ]);
    expect(columnPresetFor("GK")).toEqual([
      "Sv%",
      "xSv%",
      "xGP/90",
      "Conc/90",
      "CS/90",
      "Saves/90",
      "PenSv%",
      "perf",
      "perfRole",
    ]);
  });

  it("every default preset ends with Performance and its role", () => {
    for (const group of POS_GROUPS) expect(columnPresetFor(group).slice(-2)).toEqual(["perf", "perfRole"]);
    expect(columnPresetFor(null).slice(-2)).toEqual(["perf", "perfRole"]);
  });

  it("gives every group catalog stats only, ending on that group's Performance", () => {
    for (const group of POS_GROUPS) {
      const preset = columnPresetFor(group);
      expect(preset.slice(0, -2).filter((k) => !STAT_KEYS.has(k))).toEqual([]);
      expect(new Set(preset).size).toBe(preset.length);
    }
  });

  it("falls back to an all-round preset with the own-group Performance when no position is chosen", () => {
    const preset = columnPresetFor(null);
    expect(preset.slice(-2)).toEqual(["perf", "perfRole"]);
    expect(preset.slice(0, -2).every((k) => STAT_KEYS.has(k))).toBe(true);
  });
});

describe("defaultColumnsFor", () => {
  it("puts the identity columns before the preset", () => {
    expect(defaultColumnsFor("ATA")).toEqual([...IDENTITY_DEFAULTS, ...columnPresetFor("ATA")]);
  });

  it("keys a preset by the position group, or ALL without one", () => {
    expect(presetKeyOf("PON")).toBe("PON");
    expect(presetKeyOf(null)).toBe("ALL");
  });
});
