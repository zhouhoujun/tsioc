/**
 * Default skin for the generic menu bar. Hosts can install this stylesheet and
 * override the `--menu-bar-*` variables from their theme.
 */
export const MENU_BAR_STYLE_ID = 'tsdi-menu-bar-styles';

export const MENU_BAR_CSS = `
menu-bar {
    display: inline-block;
    position: relative;
}

.menu-bar {
    position: relative;
    display: inline-flex;
    align-items: center;
}

.menu-bar-trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 9px;
    border: 1px solid var(--menu-bar-border, #cbd5e1);
    border-radius: 6px;
    background: var(--menu-bar-surface, #ffffff);
    color: var(--menu-bar-text, #334155);
    font-size: 12px;
    line-height: 1.2;
    cursor: pointer;
}

.menu-bar-trigger:hover:not(:disabled),
.menu-bar[data-open="true"] .menu-bar-trigger {
    background: var(--menu-bar-hover, #f1f5f9);
}

.menu-bar-trigger:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.menu-bar-glyph {
    font-size: 13px;
    line-height: 1;
}

.menu-bar-caret {
    color: var(--menu-bar-muted, #64748b);
    font-size: 9px;
    line-height: 1;
}

.menu-bar-popup {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 60;
    min-width: 220px;
    max-width: min(340px, calc(100vw - 24px));
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: var(--menu-bar-surface, #ffffff);
    border: 1px solid var(--menu-bar-border, #cbd5e1);
    border-radius: 10px;
    box-shadow: 0 18px 42px var(--menu-bar-shadow, rgba(15, 23, 42, 0.18));
}

.menu-bar-align-left .menu-bar-popup {
    left: 0;
    right: auto;
}

.menu-bar-popup[hidden] {
    display: none !important;
}

.menu-bar-entry {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.menu-bar-group-title {
    padding: 5px 9px 3px;
    color: var(--menu-bar-muted, #64748b);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.menu-bar-separator {
    height: 1px;
    margin: 4px 2px;
    background: var(--menu-bar-separator, #e2e8f0);
}

.menu-bar-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 9px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--menu-bar-text, #334155);
    font-size: 12px;
    line-height: 1.3;
    text-align: left;
    cursor: pointer;
}

.menu-bar-item:hover:not(:disabled) {
    background: var(--menu-bar-hover, #f1f5f9);
}

.menu-bar-item:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.menu-bar-item.is-danger {
    color: var(--menu-bar-danger, #dc2626);
}

.menu-bar-item.is-checked {
    color: var(--menu-bar-accent, #2563eb);
}

.menu-bar-item-icon {
    flex: 0 0 16px;
    width: 16px;
    text-align: center;
}

.menu-bar-item-label {
    flex: 1 1 auto;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.menu-bar-item-shortcut {
    flex: 0 0 auto;
    color: var(--menu-bar-muted, #64748b);
    font-size: 10px;
}

.menu-bar-item-check {
    flex: 0 0 auto;
    color: var(--menu-bar-accent, #2563eb);
}
`;

export function installMenuBarStyles(doc?: Document | null): void {
    if (!doc || typeof doc.createElement !== 'function' || !doc.head) {
        return;
    }
    if (doc.getElementById && doc.getElementById(MENU_BAR_STYLE_ID)) {
        return;
    }
    const style = doc.createElement('style');
    style.setAttribute('id', MENU_BAR_STYLE_ID);
    style.textContent = MENU_BAR_CSS;
    doc.head.appendChild(style);
}
