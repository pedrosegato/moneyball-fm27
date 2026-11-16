import type { AnalysisResult } from "@/engine/index";
import { DEFAULT_LEAGUE_STRENGTH_OPTIONS } from "@/engine/leagueStrength";
import { POS_GROUPS, type PosGroup } from "@/engine/positions";
import { type RoleDef, roleGroups } from "@/engine/roles/catalog";
import { i18n } from "@/i18n";
import type { table } from "@/i18n/pt-BR/table";
import { monthsCount } from "@/lib/months";
import { tableText } from "../lib/tableText";

type ColumnTexts = (typeof table)["column"];
type CopiedColumn = {
  [K in keyof ColumnTexts]: ColumnTexts[K] extends { label: string; description: string } ? K : never;
}[Exclude<keyof ColumnTexts, "leagueStrength" | "wage">];

export const columnCopy = (id: CopiedColumn) => ({
  id,
  abbr: tableText(`column.${id}.abbr`),
  label: tableText(`column.${id}.label`),
  description: tableText(`column.${id}.description`),
});

export const noClub = (): string => i18n.t("noClub");

export const groupNoun = (group: PosGroup): string => tableText(`groupNoun.${group}`);

export const poolLabel = (poolMinutes: number): string => tableText("minutesAtLeast", { minutes: poolMinutes });

export const starterMinutes = (): string => poolLabel(DEFAULT_LEAGUE_STRENGTH_OPTIONS.minMinutes);

export const againstGroup = (group: PosGroup, poolMinutes: number): string =>
  tableText("against", { group: groupNoun(group), pool: poolLabel(poolMinutes) });

export const roleAgainst = (role: RoleDef, poolMinutes: number): string =>
  tableText("against", { group: roleGroups(role).map(groupNoun).join(" e "), pool: poolLabel(poolMinutes) });

export function ownGroupAgainst({ group, poolMinutes }: Pick<AnalysisResult, "group" | "poolMinutes">) {
  const texts = POS_GROUPS.map((g) => againstGroup(g, poolMinutes));
  return (i: number): string => texts[group[i]];
}

const FEET = ["Right", "Left", "Either"] as const;
const isFoot = (foot: string): foot is (typeof FEET)[number] => (FEET as readonly string[]).includes(foot);

export const footName = (foot: string | null | undefined): string | null =>
  foot ? (isFoot(foot) ? i18n.t(`foot.${foot}`) : foot) : null;

export function monthsText(months: number): string {
  if (months < 0) return tableText("monthsLeft.ended");
  if (months === 0) return tableText("monthsLeft.thisMonth");
  return monthsCount(months);
}

const ACTION_COMPOSITES = ["actions-def", "actions-att", "actions-cre", "actions-gk", "actions-excitement"] as const;
const isActionComposite = (id: string): id is (typeof ACTION_COMPOSITES)[number] =>
  (ACTION_COMPOSITES as readonly string[]).includes(id);

export const compositeAbbr = (id: string, label: string): string =>
  isActionComposite(id) ? tableText(`actionAbbr.${id}`) : label;
