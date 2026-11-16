import type { PlayerRecord } from "@/data/types";
import { bestAbility, hasAttributes, vsAge } from "./ability";
import { contractedTo, marketValue, minutesOf, monthsLeft } from "./club";
import { GK } from "./positions";
import type { Lineup, PerformanceByGroup } from "./tacticalFit";

export const SELL_KEEP_VERDICTS = [
  "keep",
  "renew",
  "sellHigh",
  "sellNow",
  "surplus",
  "sellBeforeDecline",
  "develop",
  "loanOut",
  "release",
  "notEnoughData",
] as const;

export type SellKeepVerdict = (typeof SELL_KEEP_VERDICTS)[number];

export type SellKeepReason =
  | { kind: "starter"; pos: string }
  | { kind: "backup"; pos: string }
  | { kind: "noRole" }
  | { kind: "contract"; months: number }
  | { kind: "overvalued"; ratio: number }
  | { kind: "undervalued"; ratio: number }
  | { kind: "pastPeak"; age: number }
  | { kind: "loanedOut" }
  | { kind: "judgedOnAttributes"; age: number; minutes: number; vsAge: number; ability: number }
  | { kind: "tooFewMinutes"; minMinutes: number; ability: number | null };

export interface Verdict {
  verdict: SellKeepVerdict;
  reasons: SellKeepReason[];
}

export interface SellKeepOptions {
  devVsAge: number;
  loanVsAge: number;
  youngAge: number;
  contractMonths: number;
  sellHighRatio: number;
  declineAge: number;
  gkDeclineAge: number;
  poolMinutes: number;
}

export const DEFAULT_SELL_KEEP_OPTIONS: Readonly<SellKeepOptions> = Object.freeze<SellKeepOptions>({
  devVsAge: 100,
  loanVsAge: 85,
  contractMonths: 12,
  sellHighRatio: 2,
  declineAge: 29,
  gkDeclineAge: 33,
  youngAge: 23,
  poolMinutes: 300,
});

const UNDERVALUED_NOTE = 0.5;

export interface SellKeepContext<G extends string> {
  records: readonly PlayerRecord[];
  groups: readonly (G | null)[];
  positions: readonly ReadonlySet<string>[];
  perf: ArrayLike<number>;
  perfIn: PerformanceByGroup<G>;
  fair: ArrayLike<number>;
  lineup: Lineup;
  slotGroup: (slot: string) => G | null;
  clubUid: number;
  date: string | null;
}

export function contractedSquad(records: readonly PlayerRecord[], clubUid: number | null): number[] {
  return records.flatMap((r, i) => (contractedTo(r, clubUid) ? [i] : []));
}

type Role = { level: 2 | 1; pos: string };

function depthChart<G extends string>(squad: readonly number[], ctx: SellKeepContext<G>, poolMinutes: number) {
  const { records, positions, perfIn, lineup, slotGroup } = ctx;
  const depth = new Map<number, Role>();
  lineup.xi.forEach((i, s) => {
    if (i !== null) depth.set(i, { level: 2, pos: lineup.slots[s] });
  });
  const need = new Map<string, number>();
  for (const pos of lineup.slots) need.set(pos, (need.get(pos) ?? 0) + 1);
  for (const [pos, count] of need) {
    const group = slotGroup(pos);
    const column = group === null ? undefined : perfIn[group];
    squad
      .filter((i) => !depth.has(i) && minutesOf(records[i]) >= poolMinutes && positions[i].has(pos))
      .map((i) => [i, column ? column[i] : NaN] as const)
      .filter(([, p]) => !Number.isNaN(p))
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .forEach(([i]) => {
        depth.set(i, { level: 1, pos });
      });
  }
  return depth;
}

export function sellKeep<G extends string>(
  squad: readonly number[],
  ctx: SellKeepContext<G>,
  opts: SellKeepOptions = DEFAULT_SELL_KEEP_OPTIONS,
): Map<number, Verdict> {
  const { records, groups, perf, fair, clubUid, date } = ctx;
  const depth = depthChart(squad, ctx, opts.poolMinutes);
  const out = new Map<number, Verdict>();
  for (const i of squad) {
    const r = records[i];
    const minutes = minutesOf(r);
    const enough = minutes >= opts.poolMinutes && !Number.isNaN(perf[i]);
    const age = r.age ?? NaN;
    const months = monthsLeft(r, date);
    const fv = enough ? fair[i] : NaN;
    const value = marketValue(r);
    const over = value > 0 && Number.isFinite(fv) ? value / fv : NaN;
    const role = depth.get(i);
    const level = role?.level ?? 0;
    const peak = groups[i] === GK ? opts.gkDeclineAge : opts.declineAge;
    const contractEnding = !Number.isNaN(months) && months <= opts.contractMonths;

    const reasons: SellKeepReason[] = [];
    if (role) reasons.push({ kind: role.level === 2 ? "starter" : "backup", pos: role.pos });
    else if (enough) reasons.push({ kind: "noRole" });
    if (contractEnding) reasons.push({ kind: "contract", months });
    if (over >= opts.sellHighRatio) reasons.push({ kind: "overvalued", ratio: over });
    else if (over <= UNDERVALUED_NOTE) reasons.push({ kind: "undervalued", ratio: over });
    if (age >= peak) reasons.push({ kind: "pastPeak", age });
    if (r.owner_uid === clubUid) reasons.push({ kind: "loanedOut" });

    const ability = bestAbility(r.attrs, r.position).score;
    const va = vsAge(ability, r.age);
    let verdict: SellKeepVerdict;
    if (!enough && age <= opts.youngAge && !Number.isNaN(va)) {
      reasons.unshift({ kind: "judgedOnAttributes", age, minutes, vsAge: va, ability });
      verdict = va >= opts.devVsAge ? "develop" : va >= opts.loanVsAge ? "loanOut" : "release";
    } else if (!enough) {
      reasons.unshift({
        kind: "tooFewMinutes",
        minMinutes: opts.poolMinutes,
        ability: hasAttributes(r.attrs) ? ability : null,
      });
      verdict = "notEnoughData";
    } else if (contractEnding) verdict = level ? "renew" : "sellNow";
    else if (over >= opts.sellHighRatio && (level < 2 || age >= peak - 1)) verdict = "sellHigh";
    else if (!level) verdict = "surplus";
    else if (age >= peak && level < 2) verdict = "sellBeforeDecline";
    else verdict = "keep";
    out.set(r.uid, { verdict, reasons });
  }
  return out;
}
