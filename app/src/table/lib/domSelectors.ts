export const COLUMN_CELL = "[data-column-id]";

export const HEADER_CELL = "th[data-column-id]";

export const PLAYER_ROW = "tr[data-player]";

export const POSITIONED_ROW = "tr[data-position]";

export const TABBABLE_ROW = 'tr[tabindex="0"]';

export const ROW_CONTROL = "button, a[href], input, select, textarea, [role=button]";

export const ROW_CHECK = "[data-row-check]";

export const HEADER_CONTROL = "[data-header-slot]";

export const TOOLBAR = '[role="toolbar"]';

export const TABLE_SEARCH = "[data-table-search]";

export const headerOf = (columnId: string): string => `thead [data-column-id="${CSS.escape(columnId)}"]`;

export const headerCellOf = (columnId: string): string => `thead th[data-column-id="${CSS.escape(columnId)}"]`;

export const headerControlOf = (slot: string): string => `[data-header-slot="${slot}"]`;

export const playerRowOf = (uid: number): string => `${PLAYER_ROW}[data-player="${uid}"]`;

export const rowAt = (position: number): string => `tr[data-position="${position}"]`;
