import { installStyleSheet } from '../../src/styles';

export const COMMAND_PALETTE_STYLE_ID = 'tsdi-command-palette-styles';

export const COMMAND_PALETTE_CSS = `
.ui-command-palette { position: fixed; inset: 0; z-index: var(--ui-z-overlay, 1000); display: flex; align-items: flex-start; justify-content: center; }
.ui-command-palette-backdrop { position: absolute; inset: 0; background: var(--ui-backdrop, rgba(0, 0, 0, 0.35)); }
.ui-command-palette-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.35ch;
    width: min(72ch, calc(100vw - 4ch));
    margin-top: 12vh;
    padding: 0.75ch;
    background: var(--ui-overlay-bg, var(--ui-bg, inherit));
    border: 1px solid var(--ui-border, currentColor);
    box-shadow: var(--ui-overlay-shadow, 0 12px 32px rgba(0, 0, 0, 0.25));
}
.ui-command-palette-header { display: flex; align-items: center; justify-content: space-between; gap: 1ch; }
.ui-command-palette-title { font-weight: 600; }
.ui-command-palette-close {
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    padding: 0 0.25ch;
}
.ui-command-palette-hint { color: var(--ui-muted-fg, inherit); font-size: 0.85em; }
`;

export function installCommandPaletteStyles(doc?: Document | null): void {
    installStyleSheet(doc, COMMAND_PALETTE_STYLE_ID, COMMAND_PALETTE_CSS);
}
