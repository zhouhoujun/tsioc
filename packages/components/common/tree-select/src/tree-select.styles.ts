import { installStyleSheet } from '../../src/styles';

export const TREE_SELECT_STYLE_ID = 'tsdi-tree-select-styles';

export const TREE_SELECT_CSS = `
.ui-tree-select {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    min-width: 14ch;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    background: var(--ui-field-bg, transparent);
}
.ui-tree-select:focus-visible { outline: 2px solid var(--ui-focus-ring, currentColor); outline-offset: 1px; }
.ui-tree-select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1ch;
    padding: 0.15em 0.75ch;
    cursor: pointer;
}
.ui-tree-select-values {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3em;
    min-width: 0;
}
.ui-tree-select-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    max-width: 18ch;
    padding: 0.05em 0.4em;
    border: 1px solid var(--ui-border, #cbd5e1);
    border-radius: 0.8em;
    color: var(--ui-fg, inherit);
}
.ui-tree-select-chip-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.ui-tree-select-chip-remove {
    border: 0;
    padding: 0;
    background: transparent;
    color: var(--ui-muted-fg, inherit);
    cursor: pointer;
}
.ui-tree-select-value.is-placeholder { color: var(--ui-muted-fg, inherit); }
.ui-tree-select-caret { color: var(--ui-muted-fg, inherit); }
.ui-tree-select-panel {
    position: absolute;
    z-index: 22;
    left: 0;
    right: 0;
    top: calc(100% + 2px);
    max-height: 16em;
    overflow-y: auto;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    background: var(--ui-popover-bg, var(--ui-dialog-bg, var(--ui-bg, inherit)));
}
.ui-tree-select.is-disabled { opacity: var(--ui-disabled-opacity, 0.55); }
`;

export function installTreeSelectStyles(doc?: Document | null): void {
    installStyleSheet(doc, TREE_SELECT_STYLE_ID, TREE_SELECT_CSS);
}
