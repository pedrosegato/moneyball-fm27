import { Menu as MenuPrimitive } from "@base-ui/react/menu";

export type HeaderMenuHandle = MenuPrimitive.Handle<string>;
export const createHeaderMenuHandle = (): HeaderMenuHandle => MenuPrimitive.createHandle<string>();
