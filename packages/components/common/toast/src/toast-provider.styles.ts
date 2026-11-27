import { installStyleSheet } from '../../src/styles';

export const TOAST_PROVIDER_STYLE_ID = 'tsdi-toast-provider-styles';
export const TOAST_PROVIDER_CSS = `
.ui-toast-provider { position: fixed; z-index: 60; pointer-events: none; }
.ui-toast-provider > * { pointer-events: auto; }
.ui-toast-provider.is-top-left { top: 12px; left: 12px; }
.ui-toast-provider.is-top-right { top: 12px; right: 12px; }
.ui-toast-provider.is-bottom-left { bottom: 12px; left: 12px; }
.ui-toast-provider.is-bottom-right { bottom: 12px; right: 12px; }
.ui-toast-provider-more { display: block; margin-top: 4px; color: var(--ui-muted-fg, #64748b); font-size: 11px; text-align: right; }
`;

export function installToastProviderStyles(doc?: Document | null): void {
    installStyleSheet(doc, TOAST_PROVIDER_STYLE_ID, TOAST_PROVIDER_CSS);
}
