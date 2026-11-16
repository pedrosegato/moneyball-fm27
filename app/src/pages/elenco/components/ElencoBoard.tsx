import { useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { Page } from "@/components/Page";
import type { PlayerRecord, Tactic } from "@/data/types";
import type { AnalysisResult } from "@/engine/index";
import type { RoleId, RolePhase } from "@/engine/roles/catalog";
import { setSlotRole, shapeFromTactic } from "@/engine/tacticShape";
import { cn } from "@/lib/utils";
import type { LineupState } from "@/store/fit";
import { useAppStore } from "@/store/index";
import { ELENCO_TAB, PITCH_VIEW } from "@/store/ui";
import { useEffectiveLineup } from "../hooks/useEffectiveLineup";
import { useLineupEditor } from "../hooks/useLineupEditor";
import { useLineupXi } from "../hooks/useLineupXi";
import { useRolePerf } from "../hooks/useRolePerf";
import { useSlotLists } from "../hooks/useSlotLists";
import { useSlotNeeds } from "../hooks/useSlotNeeds";
import { benchOf } from "../lib/bench";
import { clearSlot, placePlayer } from "../lib/lineupEdits";
import { layoutSlots, viewPhases } from "../lib/pitchView";
import { TAB_PANEL_ID, tabId } from "../lib/tabs";
import { LineupBar } from "./LineupBar";
import { LineupDnd } from "./LineupDnd";
import { NeedsLine } from "./NeedsLine";
import { PitchPanel } from "./PitchPanel";
import { SigningsTab } from "./SigningsTab";
import { SlotHead } from "./SlotHead";
import { SquadTab } from "./SquadTab";

const CHOSEN_SLOT = '[role="radio"][aria-checked="true"]';
const PITCH_COLUMN = "flex shrink-0 flex-col gap-2.5 border-r border-line-subtle p-3 [--pitch-w:19rem]";
const WIDE_PITCH = "@[62rem]/fit:[--pitch-w:clamp(31rem,calc((100cqh_-_1.5rem)*0.72),34rem)]";
const WIDE_OVERVIEW = "@[62rem]/fit:[--pitch-w:calc(2*19rem_+_0.75rem)]";

interface ElencoBoardProps {
  players: readonly PlayerRecord[];
  analysis: AnalysisResult;
  club: number;
  lineup: LineupState;
  tactic: Tactic | null;
  gameDate: string | null;
}

export function ElencoBoard({ players, analysis, club, lineup, tactic, gameDate }: ElencoBoardProps) {
  const { view, setView, pitchView, setPitchView } = useAppStore(
    useShallow((s) => ({
      view: s.ui.elenco,
      setView: s.setElencoView,
      pitchView: s.ui.pitchView,
      setPitchView: s.setPitchView,
    })),
  );
  const pitchRef = useRef<HTMLDivElement>(null);
  const effective = useEffectiveLineup(lineup, tactic);
  const gameTactic = useMemo(() => tactic !== null && shapeFromTactic(tactic) !== null, [tactic]);
  const { layout, shown } = viewPhases(pitchView);
  const named = useMemo(() => layoutSlots(effective.slots, layout), [effective.slots, layout]);
  const slot = Math.min(view.slot, Math.max(0, effective.slots.length - 1));
  const perfOf = useRolePerf(analysis);
  const xi = useLineupXi(players, analysis, club, effective);
  const bench = useMemo(
    () => benchOf(gameTactic ? tactic : null, new Set(xi.flatMap((i) => (i === null ? [] : [players[i].uid])))),
    [gameTactic, tactic, xi, players],
  );
  const { needs, needSlots } = useSlotNeeds({ players, xi, slots: effective.slots, phases: shown, perfOf });
  const { signings, squadCount } = useSlotLists(players, analysis, club, slot);
  const editor = useLineupEditor({ players, analysis, club, tactic });

  const select = (next: number) => setView({ ...view, slot: next });
  const clear = () => {
    editor.edit((l) => ({ ...l, picks: clearSlot(l.picks, slot) }));
    pitchRef.current?.querySelector<HTMLElement>(CHOSEN_SLOT)?.focus();
  };
  const pickRole = (phase: RolePhase, role: RoleId) =>
    editor.edit((l) => {
      const slots = setSlotRole(l.slots, slot, phase, role);
      return slots && { ...l, slots };
    });

  return (
    <Page>
      <LineupBar
        view={pitchView}
        onView={setPitchView}
        lineup={effective}
        gameTactic={gameTactic}
        formation={lineup.formation}
        onFormation={(formation) => {
          editor.setFormation(formation);
          select(0);
        }}
        onReset={editor.reset}
      />
      <div className="flex min-h-0 flex-1 [container:fit/size]">
        <LineupDnd
          players={players}
          slots={effective.slots}
          layout={layout}
          perfOf={perfOf}
          selected={slot}
          disabled={editor.editBlocked !== null || pitchView === PITCH_VIEW.overview}
          onEdit={editor.edit}
          className="flex min-h-0 min-w-0 flex-1"
        >
          <div
            ref={pitchRef}
            className={cn(PITCH_COLUMN, pitchView === PITCH_VIEW.overview ? WIDE_OVERVIEW : WIDE_PITCH)}
          >
            <PitchPanel
              view={pitchView}
              players={players}
              slots={effective.slots}
              xi={xi}
              needs={needSlots}
              selected={slot}
              onSelect={select}
              perfOf={perfOf}
              className={cn(
                "min-h-0 w-(--pitch-w) flex-1",
                pitchView !== PITCH_VIEW.both && "max-h-[calc(var(--pitch-w)/0.62)]",
              )}
            />
            <NeedsLine slots={named} needs={needs} onSelect={select} className="w-(--pitch-w) shrink-0" />
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <SlotHead
              players={players}
              analysis={analysis}
              xi={xi}
              slot={slot}
              position={named[slot]}
              shape={effective.slots[slot]}
              perfOf={perfOf}
              tab={view.tab}
              onTab={(tab) => setView({ ...view, tab })}
              counts={{ [ELENCO_TAB.squad]: squadCount, [ELENCO_TAB.signings]: signings.length }}
              onClear={clear}
              onRole={pickRole}
              editBlocked={editor.editBlocked}
            />
            <div
              role="tabpanel"
              id={TAB_PANEL_ID}
              aria-labelledby={tabId(view.tab)}
              className="flex min-h-0 flex-1 flex-col"
            >
              {view.tab === ELENCO_TAB.signings ? (
                <SigningsTab
                  players={players}
                  analysis={analysis}
                  slot={slot}
                  signings={signings}
                  gameDate={gameDate}
                />
              ) : (
                <SquadTab
                  players={players}
                  analysis={analysis}
                  club={club}
                  formation={effective.name ?? lineup.formation}
                  xi={xi}
                  bench={bench}
                  slot={slot}
                  slotRole={effective.slots[slot]?.[layout].roleId ?? null}
                  gameDate={gameDate}
                  placeBlocked={editor.editBlocked}
                  onPlace={(uid) => editor.edit((l) => ({ ...l, picks: placePlayer(l.picks, slot, uid) }))}
                />
              )}
            </div>
          </div>
        </LineupDnd>
      </div>
    </Page>
  );
}
