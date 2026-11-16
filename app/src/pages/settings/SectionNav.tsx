import { useTranslation } from "react-i18next";
import { hrefOf } from "@/shell/Router";
import { CONFIG_SECTION, type ConfigSection, PAGE } from "@/shell/routeIds";

const SECTIONS: readonly ConfigSection[] = Object.values(CONFIG_SECTION);

export function SectionNav({ current }: { current: ConfigSection }) {
  const { t } = useTranslation("settings");
  return (
    <nav
      aria-label={t("sections.label")}
      className="flex h-10 shrink-0 items-end gap-4 border-b border-line-subtle px-4"
    >
      {SECTIONS.map((id) => (
        <a
          key={id}
          href={hrefOf(id === CONFIG_SECTION.general ? { page: PAGE.config } : { page: PAGE.config, section: id })}
          aria-current={id === current ? "page" : undefined}
          className="relative flex h-full items-center px-0.5 type-label text-fg-muted focus-ring after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-transparent hover:text-fg aria-[current=page]:text-fg aria-[current=page]:after:bg-fg"
        >
          {t(`sections.${id}`)}
        </a>
      ))}
    </nav>
  );
}
