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
