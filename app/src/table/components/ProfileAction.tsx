import { PanelRightOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { appStore } from "@/store/index";
import type { SelectionContext } from "../lib/selectionActions";
import { profileBlock } from "../lib/selectionPlan";
import { ActionButton } from "./ActionButton";

export function ProfileAction({ players }: SelectionContext) {
  const { t } = useTranslation("table");
  return (
    <ActionButton
      icon={PanelRightOpen}
      label={t("openProfile", { ns: "common" })}
      hint={t("action.profileHint")}
      blocked={profileBlock(players.length)}
      onClick={() => appStore.getState().selectPlayer(players[0].uid)}
    />
  );
}
