import { ArrowLeftRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { hrefOf } from "@/shell/Router";
import { PAGE } from "@/shell/routeIds";
import { appStore } from "@/store/index";
import type { SelectionContext } from "../lib/selectionActions";
import { compareBlock } from "../lib/selectionPlan";
import { ActionButton } from "./ActionButton";

export function CompareAction({ players }: SelectionContext) {
  const { t } = useTranslation("table");
  return (
    <ActionButton
      icon={ArrowLeftRight}
      label={t("page.comparar", { ns: "common" })}
      hint={t("action.compareHint", { count: players.length })}
      blocked={compareBlock(players.length)}
      onClick={() => {
        appStore.getState().setCompare(players.map((p) => p.uid));
        window.location.hash = hrefOf({ page: PAGE.compare });
      }}
    />
  );
}
