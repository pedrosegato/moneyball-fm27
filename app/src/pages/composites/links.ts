import { hrefOf } from "@/shell/Router";
import { CONFIG_SECTION, PAGE } from "@/shell/routeIds";

export const compositeHref = (id: string) =>
  hrefOf({ page: PAGE.config, section: CONFIG_SECTION.composites, item: id });

export const goToComposite = (id: string | undefined) => {
  window.location.hash = id ? compositeHref(id) : hrefOf({ page: PAGE.config, section: CONFIG_SECTION.composites });
};
