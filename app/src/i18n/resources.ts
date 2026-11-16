import { LOCALE } from "@/lib/constants";
import { cart } from "./pt-BR/cart";
import { common } from "./pt-BR/common";
import { compare } from "./pt-BR/compare";
import { elenco } from "./pt-BR/elenco";
import { filters } from "./pt-BR/filters";
import { graphs } from "./pt-BR/graphs";
import { player } from "./pt-BR/player";
import { positions } from "./pt-BR/positions";
import { rank } from "./pt-BR/rank";
import { roles } from "./pt-BR/roles";
import { scout } from "./pt-BR/scout";
import { settings } from "./pt-BR/settings";
import { shell } from "./pt-BR/shell";
import { stats } from "./pt-BR/stats";
import { store } from "./pt-BR/store";
import { table } from "./pt-BR/table";

export const DEFAULT_NAMESPACE = "common";

export const resources = {
  [LOCALE]: {
    common,
    shell,
    settings,
    player,
    compare,
    graphs,
    scout,
    rank,
    stats,
    roles,
    positions,
    store,
    table,
    filters,
    elenco,
    cart,
  },
} as const;

export type Namespace = keyof (typeof resources)[typeof LOCALE];

export const NAMESPACES = Object.keys(resources[LOCALE]) as Namespace[];
