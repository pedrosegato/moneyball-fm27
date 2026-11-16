import { ChartScatter, GitCompareArrows, type LucideIcon, Search, Star, Trophy, Users } from "lucide-react";
import { PAGE, type PageId } from "./routeIds";

export type NavPageId = Exclude<PageId, typeof PAGE.config>;

export const NAV_PAGES: readonly { page: NavPageId; icon: LucideIcon }[] = [
  { page: PAGE.scout, icon: Search },
  { page: PAGE.elenco, icon: Users },
  { page: PAGE.cart, icon: Star },
  { page: PAGE.compare, icon: GitCompareArrows },
  { page: PAGE.graphs, icon: ChartScatter },
  { page: PAGE.rank, icon: Trophy },
];

export const PAGE_NEEDS_DATA: Readonly<Record<PageId, boolean>> = {
  [PAGE.scout]: true,
  [PAGE.elenco]: true,
  [PAGE.cart]: true,
  [PAGE.compare]: true,
  [PAGE.graphs]: true,
  [PAGE.rank]: true,
  [PAGE.config]: false,
};
