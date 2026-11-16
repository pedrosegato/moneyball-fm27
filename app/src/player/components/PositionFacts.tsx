import { useTranslation } from "react-i18next";
import { PitchMap } from "@/components/PitchMap";
import type { PlayerRecord } from "@/data/types";
import { heightOf } from "@/engine/club";
import { GROUP_LABELS } from "@/engine/data/groups";
import type { PosGroup } from "@/engine/positions";
import { EMPTY_VALUE } from "@/lib/constants";
import { formatCount, formatFixed, orEmpty } from "@/lib/format";
import { footName } from "@/table/columns/labels";
import { pitchLevels } from "../lib/profile";

interface PositionFactsProps {
  player: PlayerRecord;
  group: PosGroup;
  ability: number;
}

export function PositionFacts({ player, group, ability }: PositionFactsProps) {
  const { t } = useTranslation("player");
  const facts = [
    [t("facts.group"), GROUP_LABELS[group]],
    [t("facts.foot"), footName(player.foot) ?? EMPTY_VALUE],
    [t("facts.height"), orEmpty(heightOf(player), (v) => t("facts.heightValue", { cm: formatCount(v) }))],
    [t("facts.ability"), orEmpty(ability, (v) => t("facts.abilityValue", { value: formatFixed(v, 1) }))],
  ] as const;
  return (
    <div className="flex items-start gap-4">
      <PitchMap mode="highlight" levels={pitchLevels(player.pos)} className="shrink-0" />
      <dl className="flex min-w-0 flex-col gap-2 pt-1">
        {facts.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <dt className="type-caption text-fg-muted">{label}</dt>
            <dd className="tabular-nums text-fg">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
