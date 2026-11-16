import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SegmentedControlItem } from "@/components/SegmentedControlItem";
import { useAppStore } from "@/store/index";
import { defaultSettings, type Theme } from "@/store/settings";
import { Row } from "./Row";
import { Section } from "./Section";

export function Appearance() {
  const { t } = useTranslation("settings");
  const { theme, updateSettings } = useAppStore(
    useShallow((s) => ({ theme: s.settings.theme, updateSettings: s.updateSettings })),
  );
  const fallback = defaultSettings().theme;
  return (
    <Section
      title={t("appearance.title")}
      onRestore={theme !== fallback ? () => updateSettings({ theme: fallback }) : undefined}
    >
      <Row label={t("appearance.theme")} description={t("appearance.themeHint")}>
        <SegmentedControl
          aria-label={t("appearance.theme")}
          value={theme}
          onValueChange={(next) => updateSettings({ theme: next as Theme })}
        >
          <SegmentedControlItem value="dark">
            <Moon aria-hidden />
            {t("appearance.dark")}
          </SegmentedControlItem>
          <SegmentedControlItem value="light">
            <Sun aria-hidden />
            {t("appearance.light")}
          </SegmentedControlItem>
        </SegmentedControl>
      </Row>
    </Section>
  );
}
