/**
 * Shared dismissal policy for non-modal selection panels.
 *
 * Select/autocomplete/tree-select panels all need the same contract: a
 * pointer-down outside the anchor/panel closes them, and Escape closes the
 * top panel without leaking to the composer. Hosts that can portal the panel
 * still own placement; this helper only binds dismissal.
 */
export interface SelectionPanelOptions {
    /** Element that owns the panel (contains both trigger and popup). */
    anchor: any;
    /** Popup element, when it lives outside the anchor (portal). */
    panel?: any;
    close(): void;
    /** Defaults to true. */
    outside?: boolean;
    /** Defaults to true. */
    escape?: boolean;
}

export function bindSelectionPanel(
    doc: Document | null | undefined,
    options: SelectionPanelOptions
): () => void {
    if (!doc?.addEventListener || !options?.anchor || typeof options.close !== 'function') {
        return () => undefined;
    }
    const contains = (event: any): boolean => {
        const target = event?.target;
        return !!target && (options.anchor === target || options.anchor?.contains?.(target)
            || options.panel === target || options.panel?.contains?.(target));
    };
    const pointer = (event: any): void => {
        if (!contains(event)) {
            options.close();
        }
    };
    const key = (event: any): void => {
        if (String(event?.key || '') !== 'Escape') {
            return;
        }
        event.preventDefault?.();
        event.stopPropagation?.();
        options.close();
    };
    const outside = options.outside !== false;
    const escape = options.escape !== false;
    if (outside) {
        doc.addEventListener('pointerdown', pointer, true);
        doc.addEventListener('mousedown', pointer, true);
    }
    if (escape) {
        doc.addEventListener('keydown', key, true);
    }
    return () => {
        if (outside) {
            doc.removeEventListener?.('pointerdown', pointer, true);
            doc.removeEventListener?.('mousedown', pointer, true);
        }
        if (escape) {
            doc.removeEventListener?.('keydown', key, true);
        }
    };
}
