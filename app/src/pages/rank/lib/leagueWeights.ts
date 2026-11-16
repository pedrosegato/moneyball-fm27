import { foldText } from "@/lib/text";
import { appStore } from "@/store/index";
import { type LeagueRow, weightsWith } from "./rankRows";

export const leagueMatches = (row: LeagueRow, typed: string): boolean =>
  foldText(`${row.name} ${row.key} ${row.nation ?? ""}`).includes(typed);

export function setLeagueWeight(key: string, weight: number, fallback: number) {
  const { settings, updateSettings } = appStore.getState();
  const leagueWeights = weightsWith(settings.engine.leagueWeights, key, weight, fallback);
  updateSettings({ engine: { ...settings.engine, leagueWeights } });
}

export function resetLeagueWeights() {
  const { settings, updateSettings } = appStore.getState();
  updateSettings({ engine: { ...settings.engine, leagueWeights: {} } });
}
