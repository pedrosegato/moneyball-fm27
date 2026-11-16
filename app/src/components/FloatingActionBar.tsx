import { X } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLastInput } from "@/lib/useLastInput";
import { cn } from "@/lib/utils";

const LEAVE_MS = 150;

interface FloatingActionBarProps {
  open: boolean;
  label: string;
  summary: ReactNode;
  children: ReactNode;
  onClear(): void;
  clearLabel: string;
  leaveAtOnce?: boolean;
  className?: string;
}

interface Shown {
  leaving: boolean;
  instant: boolean;
}

function nextShown(prev: Shown | null, open: boolean, instant: boolean): Shown | null {
  if (open) return prev && !prev.leaving ? prev : { leaving: false, instant };
  return !prev || instant ? null : { leaving: true, instant: false };
}

export function FloatingActionBar({
  open,
  label,
  summary,
  children,
  onClear,
  clearLabel,
  leaveAtOnce = false,
  className,
}: FloatingActionBarProps) {
  const lastInput = useLastInput();
  const [shown, setShown] = useState<Shown | null>(null);
  const [seen, setSeen] = useState<{ open: boolean; leaveAtOnce: boolean } | null>(null);
  if (seen?.open !== open || seen.leaveAtOnce !== leaveAtOnce) {
    setSeen({ open, leaveAtOnce });
    setShown(nextShown(shown, open, lastInput.current === "keyboard" || (!open && leaveAtOnce)));
  }

  const leaving = !!shown?.leaving;
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setShown(null), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  if (!shown) return null;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClear();
      return;
    }
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
    if (!(e.key in moves) && e.key !== "Home" && e.key !== "End") return;
    const controls = [...e.currentTarget.querySelectorAll<HTMLElement>("button")];
    const at = controls.indexOf(e.target as HTMLElement);
    if (at < 0) return;
    e.preventDefault();
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? controls.length - 1
          : (at + moves[e.key] + controls.length) % controls.length;
    controls[next].focus();
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <div
        role="toolbar"
        aria-label={label}
        data-leaving={shown.leaving || undefined}
        data-instant={shown.instant || undefined}
        inert={shown.leaving}
        onKeyDown={onKeyDown}
        className={cn(
          "pointer-events-auto flex max-w-full min-w-0 items-center gap-1 rounded-xl border border-line bg-surface-overlay p-1.5 shadow-lg motion-rise",
          className,
        )}
      >
        <span aria-live="polite" aria-atomic className="shrink-0 px-2 type-label whitespace-nowrap text-fg-muted">
          {summary}
        </span>
        <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-line" />
        <div className="flex min-w-0 flex-wrap items-center gap-1">{children}</div>
        <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-line" />
        <Button variant="ghost" size="sm" aria-label={clearLabel} className="shrink-0 text-fg-muted" onClick={onClear}>
          <X data-icon="inline-start" />
          Limpar
        </Button>
      </div>
    </div>
  );
}
