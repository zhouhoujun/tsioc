import { installStyleSheet } from '../../src/styles';

export const FIELD_STYLE_ID = 'tsdi-field-group-styles';

export const FIELD_CSS = `
.ui-field-group { display: flex; flex-direction: column; gap: 0.25ch; min-width: 0; }
.ui-field-group-label { color: var(--ui-muted-fg, inherit); font-size: 0.9em; }
.ui-field-group-required { color: var(--ui-danger-fg, inherit); }
.ui-field-group-control { display: block; min-width: 0; }
.ui-field-group-hint { color: var(--ui-muted-fg, inherit); font-size: 0.85em; }
.ui-field-group-error { color: var(--ui-danger-fg, #cf9893); font-size: 0.85em; }
.ui-field-group[data-invalid="true"] .ui-field-group-label { color: var(--ui-danger-fg, #cf9893); }
`;

export function installFieldStyles(doc?: Document | null): void {
    installStyleSheet(doc, FIELD_STYLE_ID, FIELD_CSS);
}
