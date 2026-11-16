import { type ReactNode, useId } from "react";

interface CompositeNavGroupProps {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}

export function CompositeNavGroup({ title, aside, children }: CompositeNavGroupProps) {
  const id = useId();
  return (
    <fieldset aria-labelledby={id} className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between px-2.5 pt-3 pb-1">
        <span id={id} className="type-caption text-fg-muted">
          {title}
        </span>
        {aside}
      </div>
      {children}
    </fieldset>
  );
}
