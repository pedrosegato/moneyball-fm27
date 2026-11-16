import type { Tactic } from "@/data/types";

export const benchOf = (tactic: Tactic | null, xi: ReadonlySet<number>): number[] =>
  tactic ? tactic.subs.filter((uid) => !xi.has(uid)) : [];
