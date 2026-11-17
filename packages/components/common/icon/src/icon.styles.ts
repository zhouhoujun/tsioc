import { installStyleSheet } from '../../src/styles';

/**
 * Default skin for the shared icon directive. The directive is usable without
 * any CSS (text-only hosts simply render the glyph fallback); DOM hosts install
 * this stylesheet once to get identical square icons at every call site.
 */
export const ICON_STYLE_ID = 'tsdi-icon-styles';

export const ICON_CSS = `
.tsdi-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--tsdi-icon-size, 13px);
    height: var(--tsdi-icon-size, 13px);
    flex: none;
    line-height: 1;
    color: currentColor;
    vertical-align: -0.125em;
}

.tsdi-icon-xs { --tsdi-icon-size: 10px; }
.tsdi-icon-sm { --tsdi-icon-size: 13px; }
.tsdi-icon-md { --tsdi-icon-size: 16px; }
.tsdi-icon-lg { --tsdi-icon-size: 20px; }

.tsdi-icon .tsdi-icon-svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
}

.tsdi-icon .tsdi-icon-glyph {
    display: block;
    font-size: calc(var(--tsdi-icon-size, 13px) - 1px);
    font-style: normal;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
}

/* Vector renderers draw the SVG; the glyph stays in the tree as the fallback
   for text-only renderers (the console/TUI), which ignore the empty SVG. */
.tsdi-icon .tsdi-icon-svg + .tsdi-icon-glyph {
    display: none;
}
`;

export function installIconStyles(doc?: Document | null): void {
    installStyleSheet(doc, ICON_STYLE_ID, ICON_CSS);
}
