import { type ReactNode, useId } from "react";

interface ProfileSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function ProfileSection({ title, description, children }: ProfileSectionProps) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 border-t border-line-subtle px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <h3 id={id} className="type-label text-fg">
          {title}
        </h3>
        {description && <p className="type-caption text-fg-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}
