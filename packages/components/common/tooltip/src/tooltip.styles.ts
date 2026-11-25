import { installStyleSheet } from '../../src/styles';

export const TOOLTIP_STYLE_ID = 'tsdi-tooltip-styles';

export const TOOLTIP_CSS = `
.ui-tooltip {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-width: 0;
}
.ui-tooltip:focus-visible {
    outline: 2px solid var(--ui-focus-ring, currentColor);
    outline-offset: 1px;
}
.ui-tooltip-popup {
    position: absolute;
    z-index: 20;
    max-width: 42ch;
    padding: 0.25em 0.6ch;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: var(--ui-radius, 4px);
    background: var(--ui-tooltip-bg, var(--ui-dialog-bg, var(--ui-bg, inherit)));
    color: var(--ui-tooltip-fg, inherit);
    box-shadow: 0 2px 8px var(--ui-shadow, rgba(0, 0, 0, 0.18));
    white-space: nowrap;
}
.ui-tooltip-popup.is-top { bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%); }
.ui-tooltip-popup.is-bottom { top: calc(100% + 4px); left: 50%; transform: translateX(-50%); }
.ui-tooltip-popup.is-left { right: calc(100% + 4px); top: 50%; transform: translateY(-50%); }
.ui-tooltip-popup.is-right { left: calc(100% + 4px); top: 50%; transform: translateY(-50%); }
`;

export function installTooltipStyles(doc?: Document | null): void {
    installStyleSheet(doc, TOOLTIP_STYLE_ID, TOOLTIP_CSS);
}
