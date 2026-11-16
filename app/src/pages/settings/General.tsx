import { Appearance } from "./Appearance";
import { CompositesLink } from "./CompositesLink";
import { GameCurrency } from "./GameCurrency";
import { GameSettings } from "./GameSettings";
import { LeagueAdjustment } from "./LeagueAdjustment";
import { RestoreAll } from "./RestoreAll";

export function General() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[44rem] flex-col px-6 py-2">
        <Appearance />
        <GameCurrency />
        <GameSettings />
        <LeagueAdjustment />
        <CompositesLink />
        <RestoreAll />
      </div>
    </div>
  );
}
