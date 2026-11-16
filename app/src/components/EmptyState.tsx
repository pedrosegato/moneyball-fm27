import { type LucideIcon, SearchXIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function EmptyState({ title, description, action, icon: Icon = SearchXIcon, className }: EmptyStateProps) {
  return (
    <Empty className={cn("gap-5 p-8", className)}>
      <EmptyHeader className="max-w-[44ch] gap-1.5">
        <EmptyMedia variant="icon" className="mb-1">
          <Icon aria-hidden />
        </EmptyMedia>
        <EmptyTitle role="heading" aria-level={2}>
          {title}
        </EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent className="flex-row justify-center">{action}</EmptyContent>}
    </Empty>
  );
}
