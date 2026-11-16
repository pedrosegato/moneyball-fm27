import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { MAX_CUSTOM_COMPOSITES } from "@/store/compositeRules";
import { CompositeNavGroup } from "./CompositeNavGroup";
import { CompositeNavLink } from "./CompositeNavLink";
import { COMPOSITE_ROLE, type Entry, type Role } from "./entries";
import { goToComposite } from "./links";
import { NEW_ITEM } from "./model";

interface CompositeNavProps {
  entries: Entry[];
  current: string;
}

export function CompositeNav({ entries, current }: CompositeNavProps) {
  const { t } = useTranslation("settings");
  const custom = entries.filter((e) => e.role === COMPOSITE_ROLE.custom);
  const full = custom.length >= MAX_CUSTOM_COMPOSITES;
  const links = (role: Role) =>
    entries
      .filter((e) => e.role === role)
      .map((e) => <CompositeNavLink key={e.composite.id} entry={e} current={e.composite.id === current} />);
  return (
    <nav
      aria-label={t("composites.nav.label")}
      className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-line-subtle bg-surface-rail px-2 pb-4"
    >
      <CompositeNavGroup title={t("composites.nav.actions")}>{links(COMPOSITE_ROLE.actions)}</CompositeNavGroup>
      <CompositeNavGroup
        title={t("composites.nav.custom")}
        aside={
          <span className="type-caption tabular-nums text-fg-faint">
            {custom.length}/{MAX_CUSTOM_COMPOSITES}
          </span>
        }
      >
        {links(COMPOSITE_ROLE.custom)}
        <Button
          variant="ghost"
          size="sm"
          className="justify-start text-fg-muted"
          disabled={full}
          aria-current={current === NEW_ITEM ? "page" : undefined}
          onClick={() => goToComposite(NEW_ITEM)}
        >
          <Plus data-icon="inline-start" />
          {t("composites.nav.create")}
        </Button>
        {full && <p className="px-2.5 type-caption text-fg-faint">{t("composites.nav.full")}</p>}
      </CompositeNavGroup>
    </nav>
  );
}
