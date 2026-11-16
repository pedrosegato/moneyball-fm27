import { LoaderCircle } from "lucide-react";
import { Page } from "@/components/Page";
import { SkeletonRows } from "./SkeletonRows";

export function LoadingPage({ label }: { label: string }) {
  return (
    <Page aria-busy="true" className="overflow-hidden">
      <div
        className="flex h-10 shrink-0 items-center gap-2 border-b border-line-subtle px-4 type-label text-fg-muted"
        role="status"
      >
        <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
        {label}
      </div>
      <SkeletonRows />
    </Page>
  );
}
