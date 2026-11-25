import { installStyleSheet } from '../../src/styles';

export const RATE_STYLE_ID = 'tsdi-rate-styles';

export const RATE_CSS = `
.ui-rate { display: inline-flex; align-items: center; gap: 0.25ch; cursor: pointer; }
.ui-rate.is-sm { font-size: 0.9em; }
.ui-rate.is-lg { font-size: 1.25em; }
.ui-rate-star { color: var(--ui-muted-fg, inherit); }
.ui-rate-star.is-filled { color: var(--ui-warning-fg, var(--ui-accent-fg, inherit)); }
.ui-rate.is-disabled,
.ui-rate.is-readonly { opacity: var(--ui-disabled-opacity, 0.55); cursor: default; }
.ui-rate:focus-visible { outline: 2px solid var(--ui-focus-ring, currentColor); outline-offset: 1px; }
`;

export function installRateStyles(doc?: Document | null): void {
    installStyleSheet(doc, RATE_STYLE_ID, RATE_CSS);
}
