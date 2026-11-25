import { installStyleSheet } from '../../src/styles';

export const DRAWER_STYLE_ID = 'tsdi-drawer-styles';

export const DRAWER_CSS = `
.ui-drawer {
    position: fixed;
    z-index: 40;
    display: flex;
    flex-direction: column;
    max-width: 100vw;
    max-height: 100vh;
    background: var(--ui-drawer-bg, var(--ui-dialog-bg, var(--ui-bg, inherit)));
    color: inherit;
    box-shadow: 0 0 18px var(--ui-shadow, rgba(0, 0, 0, 0.24));
}
.ui-drawer.is-right { top: 0; right: 0; bottom: 0; border-left: 1px solid var(--ui-border, currentColor); }
.ui-drawer.is-left { top: 0; left: 0; bottom: 0; border-right: 1px solid var(--ui-border, currentColor); }
.ui-drawer.is-bottom { left: 0; right: 0; bottom: 0; border-top: 1px solid var(--ui-border, currentColor); }
.ui-drawer-header {
    display: flex;
    align-items: center;
    gap: 1ch;
    padding: 0.35em 0.75ch;
    border-bottom: 1px solid var(--ui-border, currentColor);
}
.ui-drawer-title { font-weight: 600; flex: 1 1 auto; min-width: 0; }
.ui-drawer-close { color: var(--ui-muted-fg, inherit); flex: 0 0 auto; }
.ui-drawer-body { padding: 0.35em 0.75ch; overflow-y: auto; min-height: 0; }
.ui-drawer-line { display: block; color: var(--ui-muted-fg, inherit); white-space: pre-wrap; }
`;

export function installDrawerStyles(doc?: Document | null): void {
    installStyleSheet(doc, DRAWER_STYLE_ID, DRAWER_CSS);
}
