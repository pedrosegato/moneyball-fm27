import type { ElencoTab } from "@/store/ui";

export const TAB_PANEL_ID = "elenco-tab-panel";
export const tabId = (tab: ElencoTab) => `elenco-tab-${tab}`;
