import { useTranslation } from "react-i18next";
import type { Entry } from "./entries";
import { compositeHref } from "./links";
import { sameWeights } from "./model";

interface CompositeNavLinkProps {
  entry: Entry;
  current: boolean;
}

export function CompositeNavLink({ entry, current }: CompositeNavLinkProps) {
  const { t } = useTranslation("settings");
  const edited = entry.preset && !sameWeights(entry.composite.weights, entry.preset.weights);
  return (
    <a
      href={compositeHref(entry.composite.id)}
      aria-current={current ? "page" : undefined}
      className="flex h-7 min-w-0 items-center gap-2 rounded-md px-2.5 text-fg-secondary focus-ring hover:bg-surface-hover hover:text-fg aria-[current=page]:bg-surface-hover aria-[current=page]:text-fg"
    >
      <span className="min-w-0 truncate" title={entry.name}>
        {entry.name}
      </span>
      {edited && (
        <span className="ml-auto flex shrink-0 items-center" title={t("composites.nav.edited")}>
          <span aria-hidden className="changed-dot" />
          <span className="sr-only">{` ${t("composites.nav.editedSr")}`}</span>
        </span>
      )}
    </a>
  );
}
