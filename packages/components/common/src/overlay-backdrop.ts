import { installStyleSheet } from './styles';

const BACKDROP_STYLE_ID = 'tsdi-overlay-backdrop-styles';
const BACKDROP_CSS = `
.ui-overlay-backdrop {
    position: fixed;
    inset: 0;
    z-index: 99;
    background: var(--ui-overlay-backdrop, rgba(15, 23, 42, 0.42));
    animation: ui-overlay-backdrop-in var(--ui-motion-fast, 140ms) var(--ui-ease, ease);
}
.dialog-panel,
.ui-drawer,
.ui-popover-popup {
    animation: ui-overlay-in var(--ui-motion-fast, 140ms) var(--ui-ease, ease);
}
@keyframes ui-overlay-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
}
@keyframes ui-overlay-in {
    from { opacity: 0; transform: translateY(-4px) scale(0.99); }
    to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
    .ui-overlay-backdrop,
    .dialog-panel,
    .ui-drawer,
    .ui-popover-popup { animation: none; }
}
`;

interface InertState {
    node: Element;
    hadInert: boolean;
    inertValue: string | null;
    ariaHidden: string | null;
}

/**
 * Attach a browser backdrop and inert the page behind an overlay.
 *
 * Returns a cleanup function. Terminal documents have no `defaultView`, so both
 * effects are no-ops there and the component keeps painting the same panel.
 */
export function attachOverlayBackdrop(
    doc: Document | null | undefined,
    panel: any,
    close: () => void
): () => void {
    if (!doc?.defaultView || !doc.body || !panel) {
        return () => undefined;
    }
    installStyleSheet(doc, BACKDROP_STYLE_ID, BACKDROP_CSS);
    const backdrop = doc.createElement('div');
    backdrop.className = 'ui-overlay-backdrop';
    backdrop.setAttribute('data-overlay-backdrop', 'true');
    const click = (event: any) => {
        if (event?.target === backdrop) {
            close();
        }
    };
    backdrop.addEventListener?.('click', click);
    doc.body.appendChild(backdrop);
    const previousZ = (panel.style as any)?.zIndex || '';
    if ((panel.style as any) && !previousZ) {
        (panel.style as any).zIndex = '100';
    }

    const restore: InertState[] = [];
    const markInert = (node: any) => {
        if (!node || node === backdrop || node === panel || node?.contains?.(panel) || panel?.contains?.(node)) {
            return;
        }
        if (restore.some(item => item.node === node)) {
            return;
        }
        restore.push({
            node,
            hadInert: node.hasAttribute?.('inert') === true,
            inertValue: node.getAttribute?.('inert'),
            ariaHidden: node.getAttribute?.('aria-hidden')
        });
        node.setAttribute?.('inert', '');
        node.setAttribute?.('aria-hidden', 'true');
    };
    // Inert every sibling along the panel's ancestor chain, not only body
    // children; overlays mounted inside app shells must lock their own layer.
    let current: any = panel;
    while (current && current !== doc.body) {
        const parent: any = current.parentElement;
        if (!parent) { break; }
        Array.from(parent.children || []).forEach((sibling: any) => {
            if (sibling !== current) { markInert(sibling); }
        });
        current = parent;
    }
    Array.from(doc.body.children || []).forEach((sibling: any) => markInert(sibling));

    let released = false;
    return () => {
        if (released) {
            return;
        }
        released = true;
        backdrop.removeEventListener?.('click', click);
        backdrop.remove?.();
        if ((panel.style as any) && !previousZ) {
            (panel.style as any).zIndex = '';
        }
        restore.forEach(item => {
            if (!item.hadInert) {
                item.node.removeAttribute?.('inert');
            } else if (item.inertValue != null) {
                item.node.setAttribute?.('inert', item.inertValue);
            }
            if (item.ariaHidden == null) {
                item.node.removeAttribute?.('aria-hidden');
            } else {
                item.node.setAttribute?.('aria-hidden', item.ariaHidden);
            }
        });
    };
}
