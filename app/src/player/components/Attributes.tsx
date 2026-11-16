import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ATTRIBUTE_TIER, type AttributeTier, attributeGroups, attributeTier } from "../lib/attributeGroups";

const TIER_CLASS: Record<AttributeTier, string> = {
  [ATTRIBUTE_TIER.high]: "font-semibold text-fg",
  [ATTRIBUTE_TIER.mid]: "text-fg-secondary",
  [ATTRIBUTE_TIER.low]: "text-fg-faint",
};

export function Attributes({ attrs, keeper }: { attrs: readonly number[] | null | undefined; keeper: boolean }) {
  const { t } = useTranslation("player");
  const groups = attributeGroups(attrs, keeper);
  if (!groups) return <p className="text-fg-muted">{t("attributes.missing")}</p>;
  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <div key={g.id} className="flex flex-col gap-1">
          <h4 className="type-caption text-fg-muted">{g.label}</h4>
          <dl
            className="grid grid-flow-col grid-cols-2 gap-x-4"
            style={{ gridTemplateRows: `repeat(${Math.ceil(g.items.length / 2)}, auto)` }}
          >
            {g.items.map((a) => (
              <div
                key={a.name}
                className="flex h-6 min-w-0 items-center justify-between gap-2 border-b border-line-subtle"
              >
                <dt className="truncate text-fg-secondary" title={a.name}>
                  {a.label}
                </dt>
                <dd className={cn("tabular-nums", TIER_CLASS[attributeTier(a.value)])}>{a.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
