import type { ReactNode } from "react";

interface RowProps {
  label: string;
  description?: ReactNode;
  children: ReactNode;
}

export function Row({ label, description, children }: RowProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-8 gap-y-0.5 py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="type-label text-fg">{label}</span>
        {description && <span className="type-caption text-fg-muted">{description}</span>}
      </div>
      <div className="flex items-center justify-end gap-2">{children}</div>
    </div>
  );
}
