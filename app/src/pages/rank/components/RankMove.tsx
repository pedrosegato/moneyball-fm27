import { ArrowDown, ArrowUp } from "lucide-react";
import { formatCount } from "@/lib/format";

export interface RankMoveText {
  same: string;
  up: string;
  down: string;
}

export function RankMove({ move, text }: { move: number; text: RankMoveText }) {
  if (move === 0) {
    return (
      <span className="tabular-nums text-fg-faint" title={text.same}>
        0
      </span>
    );
  }
  const up = move > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={up ? "inline-flex items-center gap-0.5 text-fg" : "inline-flex items-center gap-0.5 text-fg-muted"}
    >
      <Icon aria-hidden className="size-3" />
      <span className="tabular-nums">{formatCount(Math.abs(move))}</span>
      <span className="sr-only"> {up ? text.up : text.down}</span>
    </span>
  );
}
