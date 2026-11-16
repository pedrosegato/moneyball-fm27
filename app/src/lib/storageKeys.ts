export const APP_ID = "moneyball-fm27";

export const STORAGE_PREFIX = `${APP_ID}:v1:`;

export const TAURI_STORE_FILE = "moneyball-fm27.json";

export const THEME_KEY = `${APP_ID}:theme`;

export const playersCsvName = (percentile: boolean): string =>
  `${APP_ID}-jogadores${percentile ? "-percentis" : ""}.csv`;
