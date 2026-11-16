import { lazy, Suspense, useEffect } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useHash } from "@/shell/Router";
import { TABLE_LAB_HASH } from "@/shell/routeIds";
import { Shell } from "@/shell/Shell";
import { appStore, useAppStore } from "@/store/index";

const TableLab = import.meta.env.DEV ? lazy(() => import("./routes/TableLab")) : null;

function useNotices() {
  const notice = useAppStore((s) => s.ui.notice);
  useEffect(() => {
    if (!notice) return;
    toast.warning(notice, { id: notice });
    appStore.getState().clearNotice();
  }, [notice]);
}

export function App() {
  const hash = useHash();
  useNotices();

  if (TableLab && hash.startsWith(TABLE_LAB_HASH)) {
    return (
      <Suspense fallback={null}>
        <TableLab />
      </Suspense>
    );
  }

  return (
    <TooltipProvider>
      <Shell />
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}
