import { installStyleSheet } from '../../src/styles';

export const RESULT_STYLE_ID = 'tsdi-result-styles';

export const RESULT_CSS = `
.ui-result { display: flex; flex-direction: column; align-items: center; gap: 0.35ch; text-align: center; }
.ui-result-icon { font-size: 1.8em; line-height: 1; color: var(--ui-accent-fg, inherit); }
.ui-result.is-success .ui-result-icon { color: var(--ui-success-fg, inherit); }
.ui-result.is-error .ui-result-icon,
.ui-result.is-500 .ui-result-icon { color: var(--ui-danger-fg, inherit); }
.ui-result.is-warning .ui-result-icon,
.ui-result.is-403 .ui-result-icon,
.ui-result.is-404 .ui-result-icon { color: var(--ui-warning-fg, inherit); }
.ui-result-title { font-weight: 600; }
.ui-result-subtitle,
.ui-result-line { color: var(--ui-muted-fg, inherit); }
.ui-result-action {
    margin-top: 0.35em;
    padding: 0.1em 0.75ch;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    cursor: pointer;
}
.ui-result-action:focus-visible { outline: 2px solid var(--ui-focus-ring, currentColor); outline-offset: 1px; }
`;

export function installResultStyles(doc?: Document | null): void {
    installStyleSheet(doc, RESULT_STYLE_ID, RESULT_CSS);
}
