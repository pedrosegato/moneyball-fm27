import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function HowToReadLine({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex min-w-0 items-start gap-2">
      <Icon aria-hidden className="mt-px size-3.5 shrink-0 text-fg-faint" />
      <span className="min-w-0">{children}</span>
    </li>
  );
}
