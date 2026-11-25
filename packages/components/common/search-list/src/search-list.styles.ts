import { installStyleSheet } from '../../src/styles';

export const SEARCH_LIST_STYLE_ID = 'tsdi-search-list-styles';

export const SEARCH_LIST_CSS = `
.ui-search-list { display: flex; flex-direction: column; gap: 0.25ch; min-width: 0; }
.ui-search-list-input {
    border: 1px solid var(--ui-border, currentColor);
    background: var(--ui-input-bg, transparent);
    color: inherit;
    font: inherit;
    padding: 0.2ch 0.5ch;
    min-width: 0;
}
.ui-search-list-status { display: flex; align-items: center; gap: 0.75ch; min-height: 1.2em; }
.ui-search-list-loading { color: var(--ui-muted-fg, inherit); font-size: 0.85em; }
.ui-search-list-error { color: var(--ui-danger-fg, #cf9893); font-size: 0.85em; }
.ui-search-list-retry {
    border: 1px solid var(--ui-border, currentColor);
    background: transparent;
    color: inherit;
    font: inherit;
    padding: 0 0.5ch;
    cursor: pointer;
}
.ui-search-list-body { display: flex; flex-direction: column; min-width: 0; }
.ui-search-list-row { min-width: 0; }
.ui-search-list-group-title {
    padding: 0.25ch 0.5ch;
    color: var(--ui-muted-fg, inherit);
    font-size: 0.85em;
    text-transform: uppercase;
}
.ui-search-list-option {
    display: flex;
    align-items: center;
    gap: 0.75ch;
    padding: 0.15ch 0.5ch;
    cursor: pointer;
}
.ui-search-list-option.is-active { background: var(--ui-selected-bg, rgba(127, 127, 127, 0.18)); }
.ui-search-list-option.is-disabled { opacity: 0.5; cursor: default; }
.ui-search-list-empty { padding: 0.5ch; color: var(--ui-muted-fg, inherit); }
`;

export function installSearchListStyles(doc?: Document | null): void {
    installStyleSheet(doc, SEARCH_LIST_STYLE_ID, SEARCH_LIST_CSS);
}
