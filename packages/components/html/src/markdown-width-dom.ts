/**
 * Browser counterpart of the terminal markdown-width sync.
 *
 * The shared markdown parser pre-wraps prose and sizes table columns from
 * `state.markdownContentWidth` (terminal columns). In the DOM there is no
 * terminal size, so the web console's `ConsoleTerminalSurfaceAccessor`
 * measures the transcript panel's real character grid and reports it through
 * the existing surface-size port. Tables then fill the browser width instead
 * of the terminal default (~96 columns), and prose wraps where the panel
 * actually ends.
 */

/** Resolve the console column count of `element` from its font metrics. */
export function measureDomConsoleColumns(element: HTMLElement | null | undefined): number {
    if (!element) {
        return 0;
    }
    const doc = element.ownerDocument;
    const view = doc?.defaultView as (Window & typeof globalThis) | null | undefined;
    if (!doc || !view) {
        return 0;
    }
    const width = Number(element.clientWidth) || 0;
    if (width <= 0) {
        return 0;
    }
    const style = view.getComputedStyle(element);
    const probe = doc.createElement('span');
    probe.textContent = '00000000';
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;';
    probe.style.fontFamily = style.fontFamily;
    probe.style.fontSize = style.fontSize;
    probe.style.fontWeight = style.fontWeight;
    probe.style.letterSpacing = style.letterSpacing;
    doc.body.appendChild(probe);
    const measured = probe.getBoundingClientRect().width / 8;
    probe.remove();
    if (!Number.isFinite(measured) || measured <= 0) {
        return 0;
    }
    // Both edges of a transcript row carry 1ch padding; keep the same small
    // gutter as the terminal host so grids never sit flush against the edge.
    return Math.max(24, Math.floor(width / measured) - 2);
}
