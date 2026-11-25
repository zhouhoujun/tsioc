import { installStyleSheet } from '../../src/styles';

export const TRANSFER_STYLE_ID = 'tsdi-transfer-styles';

export const TRANSFER_CSS = `
.ui-transfer {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 0.5ch;
    min-width: 0;
}
.ui-transfer-pane {
    display: flex;
    flex-direction: column;
    min-width: 0;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
}
.ui-transfer-header {
    padding: 0.15em 0.75ch;
    border-bottom: 1px solid var(--ui-border, currentColor);
    color: var(--ui-muted-fg, inherit);
    font-weight: 600;
}
.ui-transfer-list {
    display: flex;
    flex-direction: column;
    min-height: 4em;
    max-height: 16em;
    overflow-y: auto;
    padding: 0.15em 0;
}
.ui-transfer-item {
    display: flex;
    align-items: baseline;
    gap: 0.5ch;
    padding: 0.1em 0.75ch;
    color: inherit;
    cursor: pointer;
}
.ui-transfer-item.is-selected {
    background: var(--ui-selected-bg, transparent);
    color: var(--ui-current-fg, inherit);
    font-weight: 600;
}
.ui-transfer-item.is-disabled { opacity: var(--ui-disabled-opacity, 0.55); cursor: not-allowed; }
.ui-transfer-item:focus-visible { outline: 2px solid var(--ui-focus-ring, currentColor); outline-offset: -1px; }
.ui-transfer-description,
.ui-transfer-empty { color: var(--ui-muted-fg, inherit); }
.ui-transfer-empty { padding: 0.1em 0.75ch; }
.ui-transfer-actions {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.25ch;
}
.ui-transfer-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.2ch;
    padding: 0 0.4ch;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    color: inherit;
    cursor: pointer;
}
.ui-transfer-action[aria-disabled="true"] { opacity: var(--ui-disabled-opacity, 0.55); cursor: not-allowed; }
.ui-transfer-action:focus-visible { outline: 2px solid var(--ui-focus-ring, currentColor); outline-offset: 1px; }
.ui-transfer.is-disabled { opacity: var(--ui-disabled-opacity, 0.75); }
`;

export function installTransferStyles(doc?: Document | null): void {
    installStyleSheet(doc, TRANSFER_STYLE_ID, TRANSFER_CSS);
}
