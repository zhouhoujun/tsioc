import { installStyleSheet } from '../../src/styles';

export const POPOVER_STYLE_ID = 'tsdi-popover-styles';

export const POPOVER_CSS = `
.ui-popover { position: relative; display: inline-flex; align-items: center; min-width: 0; }
.ui-popover-popup {
    position: absolute;
    z-index: 21;
    min-width: 12ch;
    max-width: 48ch;
    padding: 0.35em 0.6ch;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    background: var(--ui-popover-bg, var(--ui-dialog-bg, var(--ui-bg, inherit)));
    color: var(--ui-popover-fg, inherit);
    box-shadow: 0 4px 14px var(--ui-shadow, rgba(0, 0, 0, 0.2));
}
.ui-popover-popup.is-top { bottom: calc(100% + 4px); left: 0; }
.ui-popover-popup.is-bottom { top: calc(100% + 4px); left: 0; }
.ui-popover-popup.is-left { right: calc(100% + 4px); top: 0; }
.ui-popover-popup.is-right { left: calc(100% + 4px); top: 0; }
.ui-popover-header { display: flex; align-items: center; gap: 1ch; }
.ui-popover-title { font-weight: 600; flex: 1 1 auto; min-width: 0; }
.ui-popover-close { color: var(--ui-muted-fg, inherit); flex: 0 0 auto; }
.ui-popover-close:hover { color: var(--ui-current-fg, inherit); }
.ui-popover-line { color: var(--ui-muted-fg, inherit); white-space: pre-wrap; overflow-wrap: anywhere; }
`;

export function installPopoverStyles(doc?: Document | null): void {
    installStyleSheet(doc, POPOVER_STYLE_ID, POPOVER_CSS);
}
