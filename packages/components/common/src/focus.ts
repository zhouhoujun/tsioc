import { unwrapReactive } from '@tsdi/components';

/**
 * Move focus to the nth node matching `selector` inside a component host.
 *
 * DOM hosts focus spans that carry `tabindex`; terminal hosts focus the same
 * node through `ConsoleElement.focus()` (enabled by the `focusable` attribute).
 * Sharing this helper keeps roving-focus widgets on one code path.
 */
export function focusNth(host: any, selector: string, index: number): void {
    const root = unwrapReactive(host);
    const nodes = root?.querySelectorAll?.(selector);
    const node = nodes?.[index];
    if (node && typeof node.focus === 'function') {
        node.focus();
    }
}

/**
 * Renderer-neutral focus helpers shared by dialogs, drawers and overlays.
 * They only touch `ownerDocument` when the host is a real DOM; console elements
 * fall through as no-ops.
 */
export const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusRoot(element: any): any {
    const raw = unwrapReactive(element);
    if (!raw) {
        return null;
    }
    if (typeof raw.matches === 'function' && raw.matches('.dialog-panel')) {
        return raw;
    }
    return raw.querySelector?.('.dialog-panel') || raw;
}

export function focusableElements(root: any): any[] {
    const element = focusRoot(root);
    return Array.from(element?.querySelectorAll?.(FOCUSABLE_SELECTOR) || [])
        .filter((item: any) => item && item.disabled !== true);
}

/** Focus the first matching element (or first focusable) inside `root`. */
export function focusFirstIn(root: any, selector?: string): any {
    const element = focusRoot(root);
    if (!element) {
        return undefined;
    }
    let target: any;
    if (selector) {
        try {
            target = element.querySelector?.(selector);
        } catch {
            target = undefined;
        }
    }
    const first = target || element.querySelector?.(FOCUSABLE_SELECTOR);
    first?.focus?.();
    return first;
}

/** Keep Tab/Shift+Tab inside `root`; returns true when focus was wrapped. */
export function trapFocusTab(root: any, event: any): boolean {
    if (!root || event?.key !== 'Tab') {
        return false;
    }
    const element = focusRoot(root);
    const focusables = focusableElements(element);
    if (!focusables.length) {
        return false;
    }
    const current = element?.ownerDocument?.activeElement;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && (current === first || !element?.contains?.(current))) {
        event.preventDefault?.();
        last.focus?.();
        return true;
    }
    if (!event.shiftKey && (current === last || !element?.contains?.(current))) {
        event.preventDefault?.();
        first.focus?.();
        return true;
    }
    return false;
}

/** Restore focus when the target still belongs to a live document. */
export function restoreFocus(element: any): void {
    const raw = unwrapReactive(element);
    if (raw && typeof raw.focus === 'function' && raw.ownerDocument?.contains?.(raw)) {
        raw.focus();
    }
}
