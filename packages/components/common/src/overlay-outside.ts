/** Shared pointer-down containment for non-modal overlays. */
export function bindOverlayOutside(
    doc: Document | null | undefined,
    panel: any,
    close: () => void
): () => void {
    if (!doc?.defaultView || !panel || typeof doc.addEventListener !== 'function') {
        return () => undefined;
    }
    const pointer = (event: any) => {
        const target = event?.target;
        if (panel === target || panel?.contains?.(target)) {
            return;
        }
        close();
    };
    doc.addEventListener('pointerdown', pointer, true);
    doc.addEventListener('mousedown', pointer, true);
    return () => {
        doc.removeEventListener?.('pointerdown', pointer, true);
        doc.removeEventListener?.('mousedown', pointer, true);
    };
}
