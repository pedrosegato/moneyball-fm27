import { stats } from "@/i18n/pt-BR/stats";

export const STAT_GROUP_IDS = [
  "gols",
  "finalizacao",
  "criacao",
  "passe",
  "cruzamento",
  "pressao",
  "posse",
  "desarmes",
  "cabeceio",
  "disciplina",
  "fisico",
  "goleiro",
  "compostas",
  "atributos",
  "contrato",
] as const;

export type StatGroup = (typeof STAT_GROUP_IDS)[number];

export interface StatGroupInfo {
  readonly id: StatGroup;
  readonly label: string;
  readonly short: string;
}

export const STAT_GROUPS: readonly StatGroupInfo[] = STAT_GROUP_IDS.map((id) => ({ id, ...stats.group[id] }));

export function groupByStatGroup<T>(items: readonly T[], groupOf: (item: T) => StatGroup) {
  return STAT_GROUPS.flatMap((group) => {
    const inGroup = items.filter((item) => groupOf(item) === group.id);
    return inGroup.length ? [{ ...group, items: inGroup }] : [];
  });
}
