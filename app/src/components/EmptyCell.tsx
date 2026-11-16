import { EMPTY_VALUE } from "@/lib/constants";

export function EmptyCell({ title }: { title?: string }) {
  return (
    <span className="text-fg-faint" title={title}>
      {EMPTY_VALUE}
    </span>
  );
}
