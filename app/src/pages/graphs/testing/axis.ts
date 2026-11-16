import type { Axis } from "../lib/scatter";

export const axis = (parts: Partial<Axis> = {}): Axis => ({
  id: "x",
  abbr: "X",
  label: "X",
  unit: "per90",
  lowerIsBetter: false,
  value: [],
  pct: [],
  ...parts,
});
