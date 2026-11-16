import { XIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export interface FilterChipProps extends Omit<ComponentProps<"button">, "children" | "onClick" | "type" | "className"> {
  label: string;
  onRemove: () => void;
  onEdit?: (label: HTMLButtonElement, viaKeyboard: boolean) => void;
  className?: string;
}

export function FilterChip({ label, onRemove, onEdit, disabled, className, ...buttonProps }: FilterChipProps) {
  return (
    <span
      data-slot="filter-chip"
      className={cn(
        "inline-flex h-6 max-w-64 shrink-0 items-center gap-1 rounded-full bg-signal-wash pr-1 pl-2.5 type-label text-fg",
        disabled && "opacity-50",
        className,
      )}
    >
      {onEdit ? (
        <button
          type="button"
          aria-label={`Editar filtro ${label}`}
          title={label}
          disabled={disabled}
          onClick={(e) => onEdit(e.currentTarget, e.detail === 0)}
          className="-my-1 -ml-2.5 min-w-0 truncate rounded-full py-1 pl-2.5 text-left tabular-nums outline-none hover:underline hover:decoration-fg-faint hover:underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {label}
        </button>
      ) : (
        <span className="truncate tabular-nums" title={label}>
          {label}
        </span>
      )}
      <button
        type="button"
        aria-label={`Remover filtro ${label}`}
        disabled={disabled}
        onClick={onRemove}
        {...buttonProps}
        className="relative grid size-4 shrink-0 place-items-center rounded-full text-fg-muted transition-[background-color,color,scale] duration-(--duration-press) ease-out outline-none after:absolute after:-inset-1 hover:bg-surface-hover hover:text-fg focus-visible:ring-2 focus-visible:ring-ring active:scale-(--motion-press-scale) disabled:pointer-events-none"
      >
        <XIcon className="size-3" aria-hidden />
      </button>
    </span>
  );
}
