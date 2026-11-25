import { installStyleSheet } from '../../src/styles';

export const UPLOAD_STYLE_ID = 'tsdi-upload-styles';

export const UPLOAD_CSS = `
.ui-upload { display: inline-flex; flex-direction: column; gap: 0.25ch; min-width: 16ch; }
.ui-upload-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.5ch;
    padding: 0.15em 0.6ch;
    border: 1px dashed var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    cursor: pointer;
    color: inherit;
}
.ui-upload-trigger:focus-visible { outline: 2px solid var(--ui-focus-ring, currentColor); outline-offset: 1px; }
.ui-upload-glyph { color: var(--ui-muted-fg, inherit); }
.ui-upload-hint,
.ui-upload-size { color: var(--ui-muted-fg, inherit); font-size: 0.9em; }
.ui-upload-file { display: flex; align-items: baseline; gap: 0.75ch; }
.ui-upload-name { min-width: 0; overflow-wrap: anywhere; }
.ui-upload-remove { color: var(--ui-muted-fg, inherit); }
.ui-upload-remove:hover { color: var(--ui-danger-fg, inherit); }
.ui-upload.is-disabled { opacity: var(--ui-disabled-opacity, 0.55); }
`;

export function installUploadStyles(doc?: Document | null): void {
    installStyleSheet(doc, UPLOAD_STYLE_ID, UPLOAD_CSS);
}
