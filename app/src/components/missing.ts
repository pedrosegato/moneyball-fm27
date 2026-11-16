import { i18n } from "@/i18n";

export type MissingReason = "sample" | "pool" | "group" | "league" | "position";

export const missingText = (reason: MissingReason): string => i18n.t(`missing.${reason}`);
