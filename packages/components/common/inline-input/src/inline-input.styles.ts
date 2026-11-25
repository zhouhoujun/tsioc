import { installStyleSheet } from '../../src/styles';

export const INLINE_INPUT_STYLE_ID = 'tsdi-inline-input-styles';

export const INLINE_INPUT_CSS = `
.ui-inline-input { display: inline-flex; align-items: center; gap: 0.5ch; min-width: 0; }
.ui-inline-input-value { cursor: text; padding: 0 0.2ch; min-width: 1ch; }
.ui-inline-input-value:focus-visible { outline: 1px solid var(--ui-accent, currentColor); }
.ui-inline-input-field {
    border: 1px solid var(--ui-border, currentColor);
    background: var(--ui-input-bg, transparent);
    color: inherit;
    font: inherit;
    padding: 0 0.35ch;
    min-width: 8ch;
}
.ui-inline-input-edit {
    border: 0;
    background: transparent;
    color: var(--ui-muted-fg, inherit);
    cursor: pointer;
    font: inherit;
    padding: 0 0.25ch;
}
.ui-inline-input-edit:disabled { opacity: 0.5; cursor: default; }
`;

export function installInlineInputStyles(doc?: Document | null): void {
    installStyleSheet(doc, INLINE_INPUT_STYLE_ID, INLINE_INPUT_CSS);
}
