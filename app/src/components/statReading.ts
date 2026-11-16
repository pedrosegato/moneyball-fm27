import { i18n } from "@/i18n";

export function readingOf(name: string, facts: readonly (string | null | false)[]): string {
  const said = facts.filter(Boolean);
  return i18n.t("stat.reading", { name, facts: said.length ? said.join(", ") : i18n.t("stat.noData") });
}

export const percentileText = (pct: number | string): string => i18n.t("stat.percentile", { pct });
