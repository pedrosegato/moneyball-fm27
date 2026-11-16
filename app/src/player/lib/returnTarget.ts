import { PLAYER_ROW, playerRowOf } from "@/table/lib/domSelectors";

export function returnTarget(uid: number, opener: HTMLElement | null): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(playerRowOf(uid)) ??
    (opener?.isConnected ? opener : null) ??
    document.querySelector<HTMLElement>(`${PLAYER_ROW}[tabindex="0"]`)
  );
}
