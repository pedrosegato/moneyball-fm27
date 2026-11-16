import { EmptyState, type EmptyStateProps } from "./EmptyState";

interface PageEmptyProps extends EmptyStateProps {
  as?: "main" | "div";
}

export function PageEmpty({ as: Frame = "main", ...props }: PageEmptyProps) {
  return (
    <Frame className="grid min-h-0 flex-1 place-items-center">
      <EmptyState {...props} />
    </Frame>
  );
}
