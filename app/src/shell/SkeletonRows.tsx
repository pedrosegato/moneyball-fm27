import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROWS = Array.from({ length: 14 }, (_, k) => `skeleton-${k}`);

export function SkeletonRows() {
  return (
    <div aria-hidden className="flex flex-col">
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="flex h-(--row-height) items-center gap-6 border-b border-line-subtle px-4">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="ml-auto h-[1.375rem] w-[2.875rem] rounded-md" />
          <Skeleton className="h-[1.375rem] w-[2.875rem] rounded-md" />
          <Skeleton className="h-[1.375rem] w-[2.875rem] rounded-md" />
        </div>
      ))}
    </div>
  );
}
