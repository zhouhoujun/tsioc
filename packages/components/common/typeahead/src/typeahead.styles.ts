import { installStyleSheet } from '../../src/styles';

export const TYPEAHEAD_STYLE_ID = 'tsdi-typeahead-styles';

export const TYPEAHEAD_CSS = `
.ui-typeahead { display: flex; flex-direction: column; gap: 0.2ch; min-width: 0; }
.ui-typeahead-status { display: flex; align-items: center; gap: 0.75ch; min-height: 1.2em; }
.ui-typeahead-loading { color: var(--ui-muted-fg, inherit); font-size: 0.85em; }
.ui-typeahead-error { color: var(--ui-danger-fg, #cf9893); font-size: 0.85em; }
.ui-typeahead-retry {
    border: 1px solid var(--ui-border, currentColor);
    background: transparent;
    color: inherit;
    font: inherit;
    padding: 0 0.5ch;
    cursor: pointer;
}
`;

export function installTypeaheadStyles(doc?: Document | null): void {
    installStyleSheet(doc, TYPEAHEAD_STYLE_ID, TYPEAHEAD_CSS);
}
