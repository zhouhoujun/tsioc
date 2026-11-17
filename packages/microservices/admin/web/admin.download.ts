/**
 * Best-effort browser download used by admin export buttons.
 *
 * Returns `false` when the host has no DOM/Blob support so callers can fall
 * back to showing the payload in a text area.
 */
export function downloadTextFile(
    doc: Document | undefined,
    filename: string,
    content: string,
    mime: string
): boolean {
    const createUrl = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
    if (!doc || !createUrl || typeof Blob === 'undefined') {
        return false;
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = doc.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return true;
}
