import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { hrefOf } from "@/shell/Router";
import { CONFIG_SECTION, PAGE } from "@/shell/routeIds";
import { Row } from "./Row";
import { Section } from "./Section";

export function CompositesLink() {
  const { t } = useTranslation("settings");
  return (
    <Section title={t("compositesLink.title")}>
      <Row label={t("compositesLink.label")} description={t("compositesLink.hint")}>
        <a
          href={hrefOf({ page: PAGE.config, section: CONFIG_SECTION.composites })}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-lg border border-line px-2.5 type-label text-fg focus-ring",
            "hover:bg-surface-hover",
          )}
        >
          {t("compositesLink.edit")}
          <ChevronRight className="size-3.5 text-fg-faint" aria-hidden />
        </a>
      </Row>
    </Section>
  );
}
