import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { ScoreCell } from "@/components/ScoreCell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PosName } from "@/engine/positions";
import type { RoleDef, RoleId, RolePhase } from "@/engine/roles/catalog";
import { formatScore } from "@/lib/format";
import type { RolePerf } from "../lib/performance";
import { rankedRoles } from "../lib/roleChoices";
import { positionName } from "../lib/slots";
import { RoleBand } from "./RoleBand";

const SCORE = "h-5 min-w-8 shrink-0 px-1";

interface SlotRolePickerProps {
  phase: RolePhase;
  position: PosName;
  role: RoleDef;
  perfOf: RolePerf;
  index: number | null;
  disabled: string | null;
  onPick(role: RoleId): void;
}

export function SlotRolePicker({ phase, position, role, perfOf, index, disabled, onPick }: SlotRolePickerProps) {
  const { t } = useTranslation("elenco");
  const scoreId = useId();
  const phaseName = t(`pitch.phase.${phase}`);
  const perfLabel = t("pitch.perfInRole");
  const choose = (id: RoleId) => {
    if (id !== role.id) onPick(id);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled !== null}
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={t("slotHead.role.trigger", { phase: phaseName, role: role.name })}
            aria-describedby={scoreId}
            title={disabled ?? role.name}
            className="max-w-full min-w-0 pl-1"
          >
            <RoleBand role={role} className="h-5 shrink-0 px-1.5" />
            <span className="min-w-0 truncate">{role.name}</span>
            <span id={scoreId} className="contents">
              <ScoreCell value={perfOf(index, role.id)} label={perfLabel} format={formatScore} className={SCORE} />
            </span>
            <ChevronDown data-icon="inline-end" className="text-fg-faint" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-max max-w-96 min-w-(--anchor-width)">
        <DropdownMenuRadioGroup value={role.id} onValueChange={choose}>
          <DropdownMenuLabel>
            {t("slotHead.role.menu", { slot: positionName(position), phase: phaseName })}
          </DropdownMenuLabel>
          {rankedRoles(position, phase, perfOf, index).map((choice) => (
            <DropdownMenuRadioItem
              key={choice.role.id}
              value={choice.role.id}
              label={choice.role.name}
              closeOnClick
              className="gap-2"
            >
              <span data-slot="role-name" className="min-w-0 flex-1 truncate">
                {choice.role.name}
              </span>
              <span className="shrink-0 type-caption text-fg-muted">{choice.role.shortName}</span>
              <ScoreCell value={choice.perf} label={perfLabel} format={formatScore} className={SCORE} />
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
