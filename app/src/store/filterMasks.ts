import type { EngineClient } from "@/engine/client";
import type { FilterSpec } from "@/engine/universe";
import { type FilterTable, usableFilters } from "./filters";

export type Masks = Partial<Record<FilterTable, Uint8Array | null>>;

export async function maskOf(
  client: EngineClient,
  filters: readonly FilterSpec[],
  players: number,
): Promise<Uint8Array | undefined> {
  try {
    const mask = await client.filter(filters);
    if (mask.length === players) return mask;
    console.warn(`Filtro não aplicado: ${mask.length} linhas para ${players} jogadores`);
  } catch (e) {
    console.warn("Filtro não aplicado", e);
  }
  return undefined;
}

export async function masksOf(
  client: EngineClient,
  players: number,
  lists: Record<FilterTable, FilterSpec[]>,
  compositeIds: readonly string[],
  tables: readonly FilterTable[],
): Promise<Masks> {
  const masks: Masks = {};
  await Promise.all(
    tables.map(async (table) => {
      const filters = usableFilters(lists[table], compositeIds);
      const visible = filters.length ? await maskOf(client, filters, players) : null;
      if (visible !== undefined) masks[table] = visible;
    }),
  );
  return masks;
}
