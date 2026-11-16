import { useTranslation } from "react-i18next";
import { myClubUid } from "@/data/myClub";
import type { PlayerRecord } from "@/data/types";
import { minutesOf } from "@/engine/club";
import type { AnalysisResult } from "@/engine/index";
import { POS_GROUPS } from "@/engine/positions";
import { capitalized } from "@/lib/format";
import { useAppStore } from "@/store/index";
import { againstGroup } from "@/table/columns/labels";
import { useProfileLines } from "../hooks/useProfileLines";
import { isKeeperRow, topStats } from "../lib/profile";
import { AllStats } from "./AllStats";
import { Attributes } from "./Attributes";
import { HeadToHead } from "./HeadToHead";
import { PlayerActions } from "./PlayerActions";
import { PlayerFicha } from "./PlayerFicha";
import { PositionFacts } from "./PositionFacts";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileSection } from "./ProfileSection";
import { RoleFacts } from "./RoleFacts";
import { TopStats } from "./TopStats";

interface PlayerProfileProps {
  player: PlayerRecord;
  i: number;
  analysis: AnalysisResult;
  minutes: ArrayLike<number>;
  titleId: string;
  onClose(): void;
}

export function PlayerProfile({ player, i, analysis, minutes, titleId, onClose }: PlayerProfileProps) {
  const { t } = useTranslation("player");
  const clubUid = useAppStore((s) => (s.data.snapshot ? myClubUid(s.data.snapshot) : null));
  const ownGroup = POS_GROUPS[analysis.group[i]];
  const { lines, profile } = useProfileLines(analysis, i, minutes, ownGroup);
  const keeper = isKeeperRow(analysis, i);
  const against = againstGroup(ownGroup, analysis.poolMinutes);
  const played = minutesOf(player) > 0;

  return (
    <>
      <ProfileHeader player={player} group={ownGroup} titleId={titleId} onClose={onClose} />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-2">
        <div className="px-4 pb-3">
          <PlayerFicha player={player} i={i} analysis={analysis} />
        </div>

        <ProfileSection title={t("section.comparison")} description={capitalized(against)}>
          {played ? <HeadToHead lines={profile} /> : <p className="text-fg-muted">{t("noMinutes.compare")}</p>}
        </ProfileSection>

        <ProfileSection title={t("section.positions")}>
          <PositionFacts player={player} group={ownGroup} ability={analysis.ability[i]} />
        </ProfileSection>

        <ProfileSection title={t("section.roles")} description={t("roles.description")}>
          <RoleFacts i={i} analysis={analysis} />
        </ProfileSection>

        <ProfileSection title={t("section.topStats")}>
          {played ? (
            <TopStats lines={topStats(lines)} against={against} />
          ) : (
            <p className="text-fg-muted">{t("noMinutes.rank")}</p>
          )}
        </ProfileSection>

        <ProfileSection title={t("section.attributes")}>
          <Attributes attrs={player.attrs} keeper={keeper} />
        </ProfileSection>

        <AllStats lines={lines} keeper={keeper} against={against} />
      </div>

      <footer className="shrink-0 border-t border-line-subtle px-4 py-3">
        <PlayerActions player={player} myClubUid={clubUid} />
      </footer>
    </>
  );
}
