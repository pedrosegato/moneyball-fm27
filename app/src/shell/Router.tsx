import { useSyncExternalStore } from "react";
import { CONFIG_SECTION, PAGE, type PageId } from "./routeIds";

export type Route =
  | { page: Exclude<PageId, typeof PAGE.config> }
  | { page: typeof PAGE.config; section?: typeof CONFIG_SECTION.composites; item?: string };

const PAGE_IDS: readonly string[] = Object.values(PAGE);

const HOME: Route = { page: PAGE.scout };

const isPage = (id: string): id is PageId => PAGE_IDS.includes(id);

const MOVED: Readonly<Record<string, PageId>> = { fit: PAGE.elenco };

function decoded(part: string): string | undefined {
  try {
    return part ? decodeURIComponent(part) : undefined;
  } catch {
    return undefined;
  }
}

export function parseRoute(hash: string): Route {
  const [part = "", tab = "", item = ""] = hash.replace(/^#\/?/, "").split("/");
  const page = Object.hasOwn(MOVED, part) ? MOVED[part] : part;
  if (!isPage(page)) return HOME;
  if (page === PAGE.config) {
    if (tab !== CONFIG_SECTION.composites) return { page };
    const id = decoded(item);
    return id ? { page, section: tab, item: id } : { page, section: tab };
  }
  return { page };
}

export function hrefOf(route: Route): string {
  if (route.page === PAGE.config && route.section) {
    return `#/config/${route.section}${route.item ? `/${encodeURIComponent(route.item)}` : ""}`;
  }
  return `#/${route.page}`;
}

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

const readHash = () => window.location.hash;

export function useHash(): string {
  return useSyncExternalStore(subscribeToHash, readHash);
}

export function useRoute(): Route {
  return parseRoute(useHash());
}
