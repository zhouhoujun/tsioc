import { installStyleSheet } from '../../src/styles';

export const IMAGE_STYLE_ID = 'tsdi-image-styles';

export const IMAGE_CSS = `
.ui-image { display: inline-flex; flex-direction: column; gap: 0.2ch; margin: 0; min-width: 0; }
.ui-image-el { display: block; max-width: 100%; border-radius: var(--ui-radius, 4px); }
.ui-image-caption { color: var(--ui-muted-fg, inherit); font-size: 0.9em; }
`;

export function installImageStyles(doc?: Document | null): void {
    installStyleSheet(doc, IMAGE_STYLE_ID, IMAGE_CSS);
}
