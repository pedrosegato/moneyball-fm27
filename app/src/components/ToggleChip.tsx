import { Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { FilterChip } from "@/components/FilterChip";
import { Button } from "@/components/ui/button";

interface ToggleChipProps {
  label: string;
  on: boolean;
  onChange(on: boolean): void;
}

let pressed: { label: string; on: boolean } | null = null;

export function ToggleChip({ label, on, onChange }: ToggleChipProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pressed?.label !== label || pressed.on !== on) return;
    pressed = null;
    root.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [label, on]);

  const toggle = (next: boolean) => {
    pressed = { label, on: next };
    onChange(next);
  };

  return (
    <div ref={root} className="flex h-8 shrink-0 items-center">
      {on ? (
        <FilterChip label={label} onRemove={() => toggle(false)} />
      ) : (
        <Button variant="ghost" size="xs" className="text-fg-muted" onClick={() => toggle(true)}>
          <Plus data-icon="inline-start" />
          {label}
        </Button>
      )}
    </div>
  );
}
