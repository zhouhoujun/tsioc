import { installStyleSheet } from '../../src/styles';

export const SEGMENTED_STYLE_ID = 'tsdi-segmented-styles';

/**
 * Segmented-control skin. The terminal separator stays in the structure so a
 * text surface can separate options; browser hosts hide it here and rely on
 * the shared selected background instead.
 */
export const SEGMENTED_CSS = `
.ui-segmented {
    display: inline-flex;
    align-items: center;
    min-width: 0;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    overflow: hidden;
}
.ui-segmented-item {
    display: inline-flex;
    align-items: center;
    gap: 0.35ch;
    padding: 0.15em 0.75ch;
    color: var(--ui-muted-fg, inherit);
    cursor: pointer;
}
.ui-segmented-item.is-selected {
    background: var(--ui-selected-bg, transparent);
    color: var(--ui-current-fg, inherit);
    font-weight: 600;
}
.ui-segmented-item.is-disabled { opacity: var(--ui-disabled-opacity, 0.55); cursor: not-allowed; }
.ui-segmented.is-disabled { opacity: var(--ui-disabled-opacity, 0.55); }
.ui-segmented-item:focus-visible {
    outline: 2px solid var(--ui-focus-ring, currentColor);
    outline-offset: -2px;
}
.ui-segmented-sep { display: none; }
`;

export function installSegmentedStyles(doc?: Document | null): void {
    installStyleSheet(doc, SEGMENTED_STYLE_ID, SEGMENTED_CSS);
}
