import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ContextColumn, HEADER_MENU_POPUP, type HeaderMenuActions } from "../lib/headerMenu";
import type { HeaderMenuHandle } from "../lib/headerMenuHandle";
import { HeaderMenuItems } from "./HeaderMenuItems";

interface HeaderMenusProps {
  handle: HeaderMenuHandle;
  actions: HeaderMenuActions;
  children: ReactNode;
}

export function HeaderMenus({ handle, actions, children }: HeaderMenusProps) {
  const { t } = useTranslation("filters");
  const [contextColumn, setContextColumn] = useState<string | null>(null);
  const pickContextColumn = useCallback(
    (id: string | undefined) => {
      if (!id || !actions.column(id)) return false;
      setContextColumn(id);
      return true;
    },
    [actions],
  );
  const handedOff = useRef(false);
  const handOff = () => {
    handedOff.current = true;
  };
  const finalFocus = () => {
    const keep = !handedOff.current;
    handedOff.current = false;
    return keep;
  };

  return (
    <>
      <ContextMenuPrimitive.Root>
        <ContextColumn value={pickContextColumn}>{children}</ContextColumn>
        <ContextMenuPrimitive.Portal>
          <ContextMenuPrimitive.Positioner className="isolate z-50 outline-none" side="bottom" align="start">
            <ContextMenuPrimitive.Popup
              aria-label={t("menu.label")}
              finalFocus={finalFocus}
              className={HEADER_MENU_POPUP}
            >
              {contextColumn && <HeaderMenuItems id={contextColumn} actions={actions} handOff={handOff} />}
            </ContextMenuPrimitive.Popup>
          </ContextMenuPrimitive.Positioner>
        </ContextMenuPrimitive.Portal>
      </ContextMenuPrimitive.Root>
      <MenuPrimitive.Root handle={handle}>
        {({ payload }) => (
          <MenuPrimitive.Portal>
            <MenuPrimitive.Positioner className="isolate z-50 outline-none" side="bottom" align="start" sideOffset={4}>
              <MenuPrimitive.Popup aria-label={t("menu.label")} finalFocus={finalFocus} className={HEADER_MENU_POPUP}>
                {payload && <HeaderMenuItems id={payload} actions={actions} handOff={handOff} />}
              </MenuPrimitive.Popup>
            </MenuPrimitive.Positioner>
          </MenuPrimitive.Portal>
        )}
      </MenuPrimitive.Root>
    </>
  );
}
