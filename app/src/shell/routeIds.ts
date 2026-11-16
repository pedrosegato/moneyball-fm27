export const PAGE = {
  scout: "scout",
  elenco: "elenco",
  cart: "carrinho",
  compare: "comparar",
  graphs: "graficos",
  config: "config",
} as const;
export type PageId = (typeof PAGE)[keyof typeof PAGE];

export const CONFIG_SECTION = { general: "geral", composites: "compostas" } as const;
export type ConfigSection = (typeof CONFIG_SECTION)[keyof typeof CONFIG_SECTION];

export const TABLE_LAB_HASH = "#/lab/tabela";
