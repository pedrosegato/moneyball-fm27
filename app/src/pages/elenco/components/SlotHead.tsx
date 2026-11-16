import { X } from "lucide-react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { PlayerRecord } from "@/data/types";
import { abilityAt } from "@/engine/ability";
import type { AnalysisResult } from "@/engine/index";
import { ROLE_PHASES, type RoleId, type RolePhase, roleById } from "@/engine/roles/catalog";
import type { ShapeSlot } from "@/engine/tacticShape";
import { formatFixed, orEmpty } from "@/lib/format";
import { playerName } from "@/lib/playerName";
import type { ElencoTab } from "@/store/ui";
import type { RolePerf } from "../lib/performance";
import { slotName } from "../lib/slots";
import { SlotRolePicker } from "./SlotRolePicker";
import { SlotTabs } from "./SlotTabs";

const CLEAR = "ml-auto text-fg-muted @max-[34rem]/head:w-7 @max-[34rem]/head:px-0!";
const ROLE_GRID =
  "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center justify-items-start gap-x-2 gap-y-1 @[44rem]/head:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)]";

interface SlotHeadProps {
  players: readonly PlayerRecord[];
  analysis: AnalysisResult;
  xi: readonly (number | null)[];
  slot: number;
  position: string;
  shape: ShapeSlot;
  perfOf: RolePerf;
  tab: ElencoTab;
  onTab(tab: ElencoTab): void;
  counts: Record<ElencoTab, number>;
  onClear(): void;
  onRole(phase: RolePhase, role: RoleId): void;
  editBlocked: string | null;
}

export function SlotHead({
  players,
  analysis,
  xi,
  slot,
  position,
  shape,
  perfOf,
  tab,
  onTab,
  counts,
  onClear,
  onRole,
  editBlocked,
}: SlotHeadProps) {
  const { t } = useTranslation("elenco");
  const pos = analysis.lineup.slots[slot];
  const mine = xi[slot];
  const ability = mine === null ? NaN : abilityAt(players[mine].attrs, pos);
  return (
    <div className="flex shrink-0 flex-col gap-1 border-b border-line-subtle px-4 pt-2 @container/head">
      <fieldset aria-label={t("slotHead.label")} className="flex min-w-0 flex-col gap-1">
        <div className="flex min-h-8 min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="type-heading whitespace-nowrap text-fg">{slotName(position)}</h2>
          {mine === null ? (
            <p className="type-label text-fg-faint">{t("slotHead.empty")}</p>
          ) : (
            <>
              <p className="flex min-w-0 items-center gap-1.5 type-label whitespace-nowrap text-fg-muted">
                <span className="mr-1.5 min-w-0 truncate text-fg">{playerName(players[mine])}</span>
                {t("slotHead.ability")}{" "}
                <span className="tabular-nums text-fg">{orEmpty(ability, (v) => formatFixed(v, 1))}</span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                className={CLEAR}
                disabled={editBlocked !== null}
                title={editBlocked ?? t("slotHead.clear")}
                onClick={onClear}
              >
                <X data-icon="inline-start" />
                <span className="@max-[34rem]/head:sr-only">{t("slotHead.clear")}</span>
              </Button>
            </>
          )}
        </div>
        <div className={ROLE_GRID}>
          {ROLE_PHASES.map((phase) => {
            const role = roleById(shape[phase].roleId);
            return (
              role && (
                <Fragment key={phase}>
                  <span className="type-label whitespace-nowrap text-fg-muted">{t(`slotHead.role.${phase}`)}</span>
                  <SlotRolePicker
                    phase={phase}
                    position={shape[phase].position}
                    role={role}
                    perfOf={perfOf}
                    index={mine}
                    disabled={editBlocked}
                    onPick={(id) => onRole(phase, id)}
                  />
                </Fragment>
              )
            );
          })}
        </div>
      </fieldset>
      <SlotTabs tab={tab} onTab={onTab} counts={counts} />
    </div>
  );
}
