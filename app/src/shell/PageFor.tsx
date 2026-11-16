import { Scout } from "@/pages/Scout";
import { Cart, Compare, Elenco, Graphs, Rank, Settings } from "./pages";
import type { Route } from "./Router";
import { PAGE } from "./routeIds";

export function PageFor({ route }: { route: Route }) {
  switch (route.page) {
    case PAGE.scout:
      return <Scout />;
    case PAGE.compare:
      return <Compare />;
    case PAGE.graphs:
      return <Graphs />;
    case PAGE.elenco:
      return <Elenco />;
    case PAGE.rank:
      return <Rank />;
    case PAGE.cart:
      return <Cart />;
    case PAGE.config:
      return <Settings section={route.section} item={route.item} />;
  }
}
