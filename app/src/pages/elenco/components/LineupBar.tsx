import { ChevronDown, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageToolbar } from "@/components/PageToolbar";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SegmentedControlItem } from "@/components/SegmentedControlItem";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FORMATIONS } from "@/engine/tacticalFit";
import { cn } from "@/lib/utils";
import type { EffectiveLineup } from "@/store/fit";
import { PITCH_VIEWS, type PitchView } from "@/store/ui";

const FORMATION_NAMES = Object.keys(FORMATIONS);
const SOURCE = "flex min-w-0 flex-[1_1_31rem] items-center";

interface LineupBarProps {
  view: PitchView;
  onView(view: PitchView): void;
  lineup: EffectiveLineup;
  gameTactic: boolean;
  formation: string;
  onFormation(formation: string): void;
  onReset(): void;
}

export function LineupBar({ view, onView, lineup, gameTactic, formation, onFormation, onReset }: LineupBarProps) {
  const { t } = useTranslation("elenco");
  const followsGame = lineup.source === "game" || (lineup.source === "app" && gameTactic);
  const orphanEdit = lineup.source === "app" && !gameTactic && lineup.name !== null;
  const shown = (
    <p className="flex min-w-0 items-baseline gap-2">
      <span className="shrink-0 type-caption text-fg-muted">
        {t(lineup.source === "game" ? "lineupBar.game" : "lineupBar.edited")}
      </span>
      {lineup.name && (
        <span className="min-w-0 truncate type-label text-fg" title={lineup.name}>
          {lineup.name}
        </span>
      )}
    </p>
  );
  return (
    <PageToolbar>
      <SegmentedControl
        aria-label={t("view.label")}
        value={view}
        onValueChange={(v) => onView(v as PitchView)}
        className="shrink-0"
      >
        {PITCH_VIEWS.map((v) => (
          <SegmentedControlItem key={v} value={v}>
            {t(`view.${v}`)}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      {followsGame ? (
        <div className={cn(SOURCE, "gap-3")}>
          {shown}
          {lineup.source === "app" && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-fg-muted"
              title={t("lineupBar.backToGameHint")}
              onClick={onReset}
            >
              <RotateCcw data-icon="inline-start" />
              {t("lineupBar.backToGame")}
            </Button>
          )}
          {lineup.gameChanged && (
            <span className="shrink-0 type-caption text-change-text" title={t("lineupBar.gameChangedHint")}>
              {t("lineupBar.gameChanged")}
            </span>
          )}
        </div>
      ) : (
        <div className={cn(SOURCE, "gap-1.5")}>
          {orphanEdit ? (
            shown
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={t("lineupBar.formation", { formation })}
                    className="tabular-nums"
                  >
                    {formation}
                    <ChevronDown data-icon="inline-end" className="text-fg-faint" />
                  </Button>
                }
              />
              <DropdownMenuContent align="start" className="w-36">
                <DropdownMenuRadioGroup value={formation} onValueChange={(f) => onFormation(f as string)}>
                  {FORMATION_NAMES.map((f) => (
                    <DropdownMenuRadioItem key={f} value={f} closeOnClick className="tabular-nums">
                      {f}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-fg-muted"
            title={t("lineupBar.autoHint")}
            onClick={onReset}
          >
            <RotateCcw data-icon="inline-start" />
            {t("lineupBar.auto")}
          </Button>
          <span
            className="ml-1.5 shrink-0 type-caption whitespace-nowrap text-fg-muted"
            title={t("lineupBar.noTacticHint")}
          >
            {t("lineupBar.noTactic")}
          </span>
        </div>
      )}
    </PageToolbar>
  );
}
