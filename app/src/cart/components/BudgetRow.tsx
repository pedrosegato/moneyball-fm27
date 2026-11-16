import type { ReactNode } from "react";

interface BudgetRowProps {
  label: ReactNode;
  title?: string;
  children: ReactNode;
}

export function BudgetRow({ label, title, children }: BudgetRowProps) {
  return (
    <>
      <dt className="min-w-0 truncate text-fg-muted" title={title}>
        {label}
      </dt>{" "}
      <dd className="justify-self-end tabular-nums text-fg-secondary">{children}</dd>
    </>
  );
}
