import { installStyleSheet } from '../../src/styles';

export const CHIP_STYLE_ID = 'tsdi-chip-styles';

/** Chip skin shared by every DOM host; terminal hosts use the console sheet. */
export const CHIP_CSS = `
.ui-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35ch;
    padding: 0.1em 0.25em 0.1em 0.75ch;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius-pill, 999px);
    background: var(--ui-chip-bg, transparent);
    color: inherit;
    font: inherit;
    line-height: 1.2;
    min-width: 0;
}
.ui-chip.is-solid {
    background: var(--ui-tone-bg, var(--ui-chip-solid-bg, var(--ui-hover-bg, transparent)));
    border-color: transparent;
    color: var(--ui-tone-fg, inherit);
}
.ui-chip.is-outline { border-color: var(--ui-tone-border, var(--ui-border, currentColor)); }
.ui-chip.is-ghost { border-color: transparent; }
.ui-chip.is-selected {
    background: var(--ui-selected-bg, transparent);
    color: var(--ui-current-fg, inherit);
}
.ui-chip.is-disabled { opacity: var(--ui-disabled-opacity, 0.55); cursor: not-allowed; }
.ui-chip:focus-visible,
.ui-chip .ui-chip-close:focus-visible {
    outline: 2px solid var(--ui-focus-ring, currentColor);
    outline-offset: 1px;
}
.ui-chip-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.4em;
    padding: 0 0.25ch;
    border-radius: var(--ui-radius, 4px);
    color: var(--ui-muted-fg, inherit);
}
.ui-chip-close:hover { background: var(--ui-hover-bg, transparent); color: var(--ui-current-fg, inherit); }
.ui-chip-close:disabled { cursor: not-allowed; }
`;

export function installChipStyles(doc?: Document | null): void {
    installStyleSheet(doc, CHIP_STYLE_ID, CHIP_CSS);
}
