import { i18n } from "@/i18n";

export const playerName = (player: { name: string | null | undefined }): string => player.name ?? i18n.t("unnamed");

export const playerSurname = (player: { name: string | null | undefined }): string =>
  player.name?.trim().split(/\s+/).at(-1) || i18n.t("unnamed");
