import { installStyleSheet } from '../../src/styles';

export const SLIDER_STYLE_ID = 'tsdi-slider-styles';

/**
 * Slider skin. The glyph track itself is renderer-neutral; this only sets the
 * accent/muted colors and focus ring for DOM hosts. Terminal hosts get the
 * same structure from the compiled console stylesheet.
 */
export const SLIDER_CSS = `
.ui-slider {
    display: inline-flex;
    align-items: center;
    gap: 0.5ch;
    min-width: 0;
}
.ui-slider-track {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    white-space: nowrap;
}
.ui-slider-filled,
.ui-slider-thumb { color: var(--ui-accent-fg, var(--ui-current-fg, inherit)); }
.ui-slider-rest { color: var(--ui-muted-fg, inherit); }
.ui-slider-label,
.ui-slider-value { color: var(--ui-muted-fg, inherit); white-space: nowrap; }
.ui-slider-value { min-width: 3ch; text-align: right; }
.ui-slider.is-disabled { opacity: var(--ui-disabled-opacity, 0.55); }
.ui-slider:focus-visible {
    outline: 2px solid var(--ui-focus-ring, currentColor);
    outline-offset: 1px;
}
`;

export function installSliderStyles(doc?: Document | null): void {
    installStyleSheet(doc, SLIDER_STYLE_ID, SLIDER_CSS);
}
