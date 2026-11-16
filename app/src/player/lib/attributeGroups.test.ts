import { describe, expect, it } from "vitest";
import { ATTRIBUTE_NAMES } from "@/engine/data/attributes";
import { attributeGroups, attributeTier } from "./attributeGroups";

const attrs = (value: (name: string, k: number) => number) => ATTRIBUTE_NAMES.map((name, k) => value(name, k));

describe("attributeGroups", () => {
  it("groups an outfielder's attributes as Técnicos, Mentais and Físicos", () => {
    const groups = attributeGroups(
      attrs(() => 50),
      false,
    )!;
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([
      ["Técnicos", 14],
      ["Mentais", 14],
      ["Físicos", 8],
    ]);
  });

  it("swaps Técnicos for the keeper's own set", () => {
    const groups = attributeGroups(
      attrs(() => 50),
      true,
    )!;
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([
      ["Goleiro", 13],
      ["Mentais", 14],
      ["Físicos", 8],
    ]);
  });

  it("shows each of the 47 attributes the reader sends, between the two sets", () => {
    const shown = new Set(
      [false, true].flatMap((keeper) =>
        attributeGroups(
          attrs(() => 50),
          keeper,
        )!.flatMap((g) => g.items.map((a) => a.name)),
      ),
    );
    expect([...shown].sort()).toEqual([...ATTRIBUTE_NAMES].sort());
  });

  it("reads the game's 1-20 from the reader's x5 values", () => {
    const groups = attributeGroups(
      attrs((name) => (name === "Finishing" ? 72 : name === "Pace" ? 98 : 41)),
      false,
    )!;
    const value = (name: string) => groups.flatMap((g) => g.items).find((a) => a.name === name)!.value;
    expect(value("Finishing")).toBe(14);
    expect(value("Pace")).toBe(20);
    expect(value("Vision")).toBe(8);
  });

  it("never shows a 0 the game has no such value for, nor more than 20", () => {
    const groups = attributeGroups(
      attrs((name) => (name === "Penalty Taking" ? 1 : name === "Pace" ? 103 : 50)),
      false,
    )!;
    const value = (name: string) => groups.flatMap((g) => g.items).find((a) => a.name === name)!.value;
    expect(value("Penalty Taking")).toBe(1);
    expect(value("Pace")).toBe(20);
  });

  it("names each attribute in pt-BR, in alphabetical order, keeping the game's English name", () => {
    const [technical] = attributeGroups(
      attrs(() => 50),
      false,
    )!;
    const labels = technical.items.map((a) => a.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, "pt-BR")));
    expect(technical.items.find((a) => a.name === "Free Kick Taking")!.label).toBe("Cobrança de falta");
  });

  it("is null when the reader sent no attributes", () => {
    expect(attributeGroups([], false)).toBeNull();
    expect(attributeGroups(null, false)).toBeNull();
    expect(attributeGroups(attrs(() => 50).slice(1), false)).toBeNull();
  });
});

describe("attributeTier", () => {
  it("marks 15+ as high and 8 or less as low, like the old page", () => {
    expect([20, 15, 14, 9, 8, 1].map(attributeTier)).toEqual(["high", "high", "mid", "mid", "low", "low"]);
  });
});
