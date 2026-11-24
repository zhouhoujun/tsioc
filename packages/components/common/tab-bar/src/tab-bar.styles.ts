import { installStyleSheet } from '../../src/styles';

/**
 * Default skin for the generic tab bar.
 *
 * Every host that renders the shared `<tab-bar>` (workflow tabs, agent web
 * console, admin shells) installs this stylesheet and only maps the
 * `--tab-*` variables from its own palette. The terminal renderer has no DOM
 * document, so it keeps its own console stylesheet.
 */
export const TAB_BAR_STYLE_ID = 'tsdi-tab-bar-styles';

export const TAB_BAR_CSS = `
tab-bar {
    display: block;
    min-width: 0;
}

/* The tabs wrapper uses the same strip; this only keeps the pane container
   from introducing a host-specific layout. */
.tabs {
    display: block;
    min-width: 0;
}

.tabs-panes {
    min-width: 0;
}

.tab-bar {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 2px;
    min-width: 0;
    min-height: 32px;
    margin: 0;
    padding: 6px 0 0;
    overflow-x: auto;
    scrollbar-width: none;
    border-bottom: 1px solid var(--tab-border, #e2e8f0);
    background: var(--tab-strip-background, transparent);
}

.tab-bar::-webkit-scrollbar {
    display: none;
}

.tab {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    max-width: 220px;
    padding: 6px 10px;
    border: 1px solid transparent;
    border-bottom: 0;
    border-radius: 8px 8px 0 0;
    background: transparent;
    color: var(--tab-muted, #64748b);
    font-size: 12.5px;
    line-height: 1.2;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
}

.tab:hover {
    background: var(--tab-hover, #f1f5f9);
}

.tab[aria-selected="true"] {
    background: var(--tab-surface, #ffffff);
    border-color: var(--tab-border, #e2e8f0);
    color: var(--tab-text, #0f172a);
    font-weight: 600;
}

.tab[data-disabled="true"] {
    color: var(--tab-muted, #64748b);
    cursor: default;
    opacity: 0.7;
}

.tab[data-disabled="true"]:hover {
    background: transparent;
}

.tab-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: pre;
}

.tab-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 8px;
    padding: 1px 2px;
    border-radius: 4px;
    color: var(--tab-muted, #64748b);
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    transition: color 120ms ease, background-color 120ms ease, opacity 120ms ease;
}

/* The close glyph turns red on hover for every tab (the active one and the
   hover-revealed affordance on the others), like the workflow tabs. */
.tab-close:hover {
    background: var(--tab-hover, #f1f5f9);
    color: var(--tab-danger, #dc2626);
}

.tab-new {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    margin-left: 4px;
    padding: 6px 8px;
    border: 1px solid transparent;
    border-radius: 7px;
    background: transparent;
    color: var(--tab-accent, #2563eb);
    font-size: 15px;
    font-weight: 700;
    line-height: 1;
    white-space: pre;
    cursor: pointer;
    transition: background-color 140ms ease, color 140ms ease, transform 140ms ease;
}

.tab-new:hover {
    background: var(--tab-hover, #f1f5f9);
    transform: scale(1.08);
}

.tab-new:active {
    transform: scale(0.96);
}

/* Overflow paging arrows: pinned to each end of the scrollable strip so the
   tabs page beneath them instead of hiding the control off-screen. */
.tab-scroll {
    position: sticky;
    z-index: 2;
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    padding: 6px 4px;
    border: 1px solid transparent;
    border-radius: 7px;
    background: var(--tab-scroll-background, var(--tab-surface, #ffffff));
    color: var(--tab-accent, #2563eb);
    font-size: 15px;
    font-weight: 700;
    line-height: 1;
    white-space: pre;
    cursor: pointer;
    transition: background-color 140ms ease, color 140ms ease;
}

.tab-scroll-back {
    left: 0;
}

.tab-scroll-forward {
    right: 0;
}

.tab-scroll:hover {
    background: var(--tab-hover, #f1f5f9);
}

.tab-scroll[data-disabled="true"] {
    color: var(--tab-muted, #94a3b8);
    cursor: default;
    opacity: 0.55;
}

.tab-scroll[data-disabled="true"]:hover {
    background: var(--tab-scroll-background, var(--tab-surface, #ffffff));
}
`;

/** Install the shared tab strip skin once per document (idempotent). */
export function installTabBarStyles(doc?: Document | null): void {
    installStyleSheet(doc, TAB_BAR_STYLE_ID, TAB_BAR_CSS);
}
