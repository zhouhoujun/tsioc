import { installStyleSheet } from '../../src/styles';

export const DATA_TABLE_COLUMNS_BUTTON_STYLE_ID = 'tsdi-data-table-columns-button-styles';

export const DATA_TABLE_COLUMNS_BUTTON_CSS = `
.ui-data-table-toolbar { display: flex; justify-content: flex-end; padding: 0 0 0.25em; }
.ui-data-table-columns-button { position: relative; display: inline-flex; }
.ui-data-table-columns-trigger {
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    background: var(--ui-button-bg, transparent);
    color: var(--ui-button-fg, inherit);
    font: inherit;
    padding: 0.1ch 0.6ch;
    cursor: pointer;
}
.ui-data-table-columns-trigger[aria-expanded="true"] {
    border-color: var(--ui-focus-ring, currentColor);
    color: var(--ui-focus-ring, inherit);
}
.ui-data-table-columns-panel {
    position: absolute;
    z-index: var(--ui-z-popover, 30);
    top: calc(100% + 2px);
    right: 0;
    min-width: 24ch;
    padding: 0.5ch;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    background: var(--ui-popover-bg, var(--ui-dialog-bg, var(--ui-bg, inherit)));
    box-shadow: var(--ui-overlay-shadow, none);
}
`;

export function installDataTableColumnsButtonStyles(doc?: Document | null): void {
    installStyleSheet(doc, DATA_TABLE_COLUMNS_BUTTON_STYLE_ID, DATA_TABLE_COLUMNS_BUTTON_CSS);
}
