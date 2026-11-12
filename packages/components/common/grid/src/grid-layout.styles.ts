/**
 * Styles for the generic grid layout.
 */
export const GRID_LAYOUT_STYLE_ID = 'tsdi-grid-layout-styles';

export const GRID_LAYOUT_CSS = `
grid-layout {
    display: block;
    min-width: 0;
    min-height: 0;
}

.grid-layout {
    display: block;
    width: 100%;
    min-width: 0;
    min-height: 0;
    box-sizing: border-box;
}

.grid-layout.is-fill,
.grid-layout.is-fill .grid-layout-items {
    height: 100%;
}

.grid-layout-items {
    display: grid;
    width: 100%;
    min-width: 0;
    min-height: 0;
    box-sizing: border-box;
}

.grid-layout-items > * {
    min-width: 0;
    min-height: 0;
    box-sizing: border-box;
}

grid-item {
    display: block;
    min-width: 0;
    min-height: 0;
}

.grid-item {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
}

.grid-item-content {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
}
`;

export function installGridLayoutStyles(doc?: Document | null): void {
    if (!doc || typeof doc.createElement !== 'function' || !doc.head) {
        return;
    }
    if (doc.getElementById && doc.getElementById(GRID_LAYOUT_STYLE_ID)) {
        return;
    }
    const style = doc.createElement('style');
    style.setAttribute('id', GRID_LAYOUT_STYLE_ID);
    style.textContent = GRID_LAYOUT_CSS;
    doc.head.appendChild(style);
}
