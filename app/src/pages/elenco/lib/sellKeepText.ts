import type { SellKeepOptions, SellKeepReason, SellKeepVerdict } from "@/engine/sellKeep";
import { formatDecimal, formatFixed } from "@/lib/format";
import { monthsCount } from "@/lib/months";
import { elencoT } from "./elencoT";
import { slotName } from "./slots";

export type SellKeepDirection = "stay" | "leave" | "neutral";

export const VERDICT_DIRECTION: Readonly<Record<SellKeepVerdict, SellKeepDirection>> = {
  keep: "stay",
  renew: "stay",
  sellHigh: "leave",
  sellNow: "leave",
  surplus: "leave",
  sellBeforeDecline: "leave",
  develop: "stay",
  loanOut: "neutral",
  release: "leave",
  notEnoughData: "neutral",
};

export const verdictLabel = (verdict: SellKeepVerdict): string => elencoT(`sellKeep.verdict.${verdict}`);

const ability = (score: number) => elencoT("sellKeep.ability", { score: formatFixed(score, 1) });

function contractText(left: number): string {
  if (left < 0) return elencoT("sellKeep.reason.contractEnded");
  if (left === 0) return elencoT("sellKeep.reason.contractThisMonth");
  return elencoT("sellKeep.reason.contractIn", { months: monthsCount(left) });
}

function tooFewMinutesText(reason: Extract<SellKeepReason, { kind: "tooFewMinutes" }>, minutes?: number): string {
  const why =
    minutes !== undefined && minutes >= reason.minMinutes
      ? elencoT("sellKeep.reason.noPerfAtPosition")
      : elencoT("sellKeep.reason.fewerMinutes", { minutes: reason.minMinutes });
  return reason.ability === null || Number.isNaN(reason.ability)
    ? elencoT("sellKeep.reason.tooFewMinutes", { why })
    : elencoT("sellKeep.reason.tooFewMinutesAbility", { why, ability: ability(reason.ability) });
}

export function reasonText(reason: SellKeepReason, minutes?: number): string {
  switch (reason.kind) {
    case "starter":
    case "backup":
      return elencoT(`sellKeep.reason.${reason.kind}`, { slot: slotName(reason.pos) });
    case "noRole":
    case "loanedOut":
      return elencoT(`sellKeep.reason.${reason.kind}`);
    case "contract":
      return contractText(reason.months);
    case "overvalued":
      return elencoT("sellKeep.reason.overvalued", { ratio: formatFixed(reason.ratio, 1) });
    case "undervalued":
      return elencoT("sellKeep.reason.undervalued", { pct: Math.round(reason.ratio * 100) });
    case "pastPeak":
      return elencoT("sellKeep.reason.pastPeak", { age: reason.age });
    case "judgedOnAttributes":
      return elencoT("sellKeep.reason.judgedOnAttributes", {
        age: reason.age,
        minutes: reason.minutes,
        vsAge: reason.vsAge,
        ability: ability(reason.ability),
      });
    case "tooFewMinutes":
      return tooFewMinutesText(reason, minutes);
  }
}

export const reasonsText = (reasons: readonly SellKeepReason[], minutes?: number): string =>
  reasons.map((r) => reasonText(r, minutes)).join("; ");

const num = (v: number) => formatDecimal(v, 2);

export function verdictRule(verdict: SellKeepVerdict, o: SellKeepOptions): string {
  const unjudged = elencoT("sellKeep.rule.unjudged", { minutes: o.poolMinutes });
  const young = elencoT("sellKeep.rule.young", { age: num(o.youngAge), unjudged });
  switch (verdict) {
    case "keep":
    case "surplus":
      return elencoT(`sellKeep.rule.${verdict}`);
    case "renew":
    case "sellNow":
      return elencoT(`sellKeep.rule.${verdict}`, { months: monthsCount(o.contractMonths) });
    case "sellHigh":
      return elencoT("sellKeep.rule.sellHigh", {
        ratio: num(o.sellHighRatio),
        age: num(o.declineAge - 1),
        gkAge: num(o.gkDeclineAge - 1),
      });
    case "sellBeforeDecline":
      return elencoT("sellKeep.rule.sellBeforeDecline", { age: num(o.declineAge), gkAge: num(o.gkDeclineAge) });
    case "develop":
    case "loanOut":
    case "release":
      return elencoT(`sellKeep.rule.${verdict}`, { young, dev: num(o.devVsAge), loan: num(o.loanVsAge) });
    case "notEnoughData":
      return elencoT("sellKeep.rule.notEnoughData", { minutes: o.poolMinutes, age: num(o.youngAge) });
  }
}
