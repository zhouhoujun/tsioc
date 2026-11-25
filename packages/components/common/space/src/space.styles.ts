import { installStyleSheet } from '../../src/styles';

export const SPACE_STYLE_ID = 'tsdi-space-styles';

export const SPACE_CSS = `
.ui-space { min-width: 0; }
.ui-space { display: block; }
.ui-space-inline { display: inline-flex; align-items: center; flex-wrap: wrap; gap: var(--ui-space-gap, 0.5ch); }
.ui-space-stack { display: flex; flex-direction: column; gap: var(--ui-space-gap, 0.35ch); }
.ui-space.is-wrap .ui-space-inline { flex-wrap: wrap; }
.ui-space.is-sm { font-size: 0.9em; }
.ui-space.is-lg { font-size: 1.1em; }
.ui-space-item[role="button"] { cursor: pointer; }
.ui-space-item[role="button"]:focus-visible { outline: 2px solid var(--ui-focus-ring, currentColor); outline-offset: 1px; }
.ui-space-sep { color: var(--ui-muted-fg, inherit); }
`;

export function installSpaceStyles(doc?: Document | null): void {
    installStyleSheet(doc, SPACE_STYLE_ID, SPACE_CSS);
}
