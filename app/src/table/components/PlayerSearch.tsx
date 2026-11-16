import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { appStore, useAppStore } from "@/store/index";
import type { SearchKey } from "@/store/ui";
import { TABLE_SEARCH } from "../lib/domSelectors";

const SHORTCUT = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl K";

const OVERLAYS = '[role="dialog"], [role="alertdialog"], [role="menu"]';

export function PlayerSearch({ searchKey }: { searchKey: SearchKey }) {
  const { t } = useTranslation("table");
  const search = useAppStore((s) => s.ui.searches[searchKey] ?? "");
  const setSearch = (text: string) => appStore.getState().setSearch(searchKey, text);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "KeyK" || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.defaultPrevented) return;
      if (document.querySelector(OVERLAYS) || document.querySelector(TABLE_SEARCH) !== input.current) return;
      e.preventDefault();
      input.current?.focus();
      input.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <InputGroup className="max-w-56 min-w-40 flex-[1_1_10rem]">
      <InputGroupAddon>
        <Search aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        ref={input}
        data-table-search=""
        type="search"
        aria-label={t("search.label")}
        placeholder={t("search.label")}
        autoComplete="off"
        spellCheck={false}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && search) {
            e.preventDefault();
            setSearch("");
          }
        }}
        className="[&::-webkit-search-cancel-button]:appearance-none"
      />
      <InputGroupAddon align="inline-end">
        {search ? (
          <InputGroupButton
            size="icon-xs"
            aria-label={t("search.clear")}
            onClick={() => {
              setSearch("");
              input.current?.focus();
            }}
          >
            <X aria-hidden />
          </InputGroupButton>
        ) : (
          <kbd
            aria-hidden
            className="rounded-sm border border-line px-1 font-sans type-caption whitespace-nowrap text-fg-faint"
          >
            {SHORTCUT}
          </kbd>
        )}
      </InputGroupAddon>
    </InputGroup>
  );
}
