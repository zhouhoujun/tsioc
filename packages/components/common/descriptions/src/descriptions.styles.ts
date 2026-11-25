import { installStyleSheet } from '../../src/styles';

export const DESCRIPTIONS_STYLE_ID = 'tsdi-descriptions-styles';

export const DESCRIPTIONS_CSS = `
.ui-descriptions {
    display: grid;
    grid-template-columns: repeat(var(--ui-descriptions-columns, 1), minmax(0, 1fr));
    gap: 0.25ch 1.5ch;
    min-width: 0;
}
.ui-descriptions-item {
    display: flex;
    align-items: baseline;
    gap: 0.5ch;
    min-width: 0;
}
.ui-descriptions.is-vertical .ui-descriptions-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1ch;
}
.ui-descriptions.is-bordered {
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    overflow: hidden;
}
.ui-descriptions.is-bordered .ui-descriptions-item {
    border-bottom: 1px solid var(--ui-border, currentColor);
    padding: 0.25em 0.75ch;
}
.ui-descriptions.is-dense .ui-descriptions-item { padding-top: 0; padding-bottom: 0; }
.ui-descriptions-label { color: var(--ui-muted-fg, inherit); flex: 0 0 auto; }
.ui-descriptions-sep { color: var(--ui-muted-fg, inherit); }
.ui-descriptions-value { color: inherit; min-width: 0; overflow-wrap: anywhere; }
.ui-descriptions-item[data-tone="accent"] .ui-descriptions-value { color: var(--ui-accent-fg, inherit); }
.ui-descriptions-item[data-tone="success"] .ui-descriptions-value { color: var(--ui-success-fg, inherit); }
.ui-descriptions-item[data-tone="warning"] .ui-descriptions-value { color: var(--ui-warning-fg, inherit); }
.ui-descriptions-item[data-tone="danger"] .ui-descriptions-value,
.ui-descriptions-item[data-tone="error"] .ui-descriptions-value { color: var(--ui-danger-fg, inherit); }
.ui-descriptions-hint { color: var(--ui-muted-fg, inherit); font-size: 0.9em; }
.ui-descriptions-empty { color: var(--ui-muted-fg, inherit); }
`;

export function installDescriptionsStyles(doc?: Document | null): void {
    installStyleSheet(doc, DESCRIPTIONS_STYLE_ID, DESCRIPTIONS_CSS);
}
