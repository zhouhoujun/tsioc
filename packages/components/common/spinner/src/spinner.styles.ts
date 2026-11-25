import { installStyleSheet } from '../../src/styles';

export const SPINNER_STYLE_ID = 'tsdi-spinner-styles';

export const SPINNER_CSS = `
.ui-spinner {
    display: inline-flex;
    align-items: center;
    gap: 0.5ch;
    min-width: 0;
}
.ui-spinner-glyph {
    color: var(--ui-accent-fg, var(--ui-current-fg, inherit));
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.ui-spinner-label { color: var(--ui-muted-fg, inherit); }
.ui-spinner.is-paused .ui-spinner-glyph { opacity: var(--ui-disabled-opacity, 0.55); }
`;

export function installSpinnerStyles(doc?: Document | null): void {
    installStyleSheet(doc, SPINNER_STYLE_ID, SPINNER_CSS);
}
