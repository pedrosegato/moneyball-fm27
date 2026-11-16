import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SegmentedControlItem } from "@/components/SegmentedControlItem";
import { Threshold } from "@/components/Threshold";
import type { Scope } from "@/data/types";
import { useAppStore } from "@/store/index";
import { POLL_SECONDS } from "@/store/settings";
import { useDataController } from "@/store/useData";
import { Row } from "./Row";
import { Section } from "./Section";
import { OFFERED_SCOPES } from "./scopes";

export function GameSettings() {
  const { t } = useTranslation("settings");
  const { t: common } = useTranslation();
  const { pollSeconds, scope, updateSettings } = useAppStore(
    useShallow((s) => ({
      pollSeconds: s.settings.pollSeconds,
      scope: s.settings.scope,
      updateSettings: s.updateSettings,
    })),
  );
  const { reload } = useDataController();
  const scopes = OFFERED_SCOPES.includes(scope) ? OFFERED_SCOPES : [...OFFERED_SCOPES, scope];
  const scopeName = (id: Scope) => (id === "all" ? common("all") : t(`game.scope.${id}`));
  return (
    <Section
      title={t("game.title")}
      onRestore={
        pollSeconds !== POLL_SECONDS.default ? () => updateSettings({ pollSeconds: POLL_SECONDS.default }) : undefined
      }
    >
      <Row label={t("game.scopeLabel")} description={t("game.scopeHint")}>
        <SegmentedControl
          aria-label={t("game.scopeLabel")}
          value={scope}
          onValueChange={(next) => {
            updateSettings({ scope: next as Scope });
            void reload();
          }}
        >
          {scopes.map((id) => (
            <SegmentedControlItem key={id} value={id}>
              {scopeName(id)}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </Row>
      <Row
        label={t("game.pollLabel")}
        description={t("game.pollHint", { min: POLL_SECONDS.min, max: POLL_SECONDS.max })}
      >
        <Threshold
          name={t("game.pollName")}
          value={pollSeconds}
          min={POLL_SECONDS.min}
          max={POLL_SECONDS.max}
          decimals={0}
          suffix={t("game.pollSuffix")}
          onCommit={(seconds) => updateSettings({ pollSeconds: Math.round(seconds) })}
        />
      </Row>
    </Section>
  );
}
