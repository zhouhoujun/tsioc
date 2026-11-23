/**
 * Normalize a browser key event into the keymap's sequence syntax.
 *
 * Shift is part of Ctrl/Alt combinations as well: browsers report Ctrl+Shift+T
 * with `key: 'T'`, and the keymap distinguishes it from Ctrl+T.
 */
export function normalizeAgentConsoleBrowserKey(
    key: string,
    modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean } = {}
): string {
    const ctrlKey = !!(modifiers.ctrlKey || modifiers.metaKey);
    const altKey = !!modifiers.altKey;
    const shiftKey = !!modifiers.shiftKey;
    const rawKey = String(key || '').toLowerCase();
    if (ctrlKey) {
        return altKey ? `ctrl+alt+${rawKey}` : shiftKey ? `ctrl+shift+${rawKey}` : `ctrl+${rawKey}`;
    }
    if (altKey) {
        return shiftKey ? `alt+shift+${rawKey}` : `alt+${rawKey}`;
    }
    if (shiftKey && rawKey === 'tab') {
        return 'shift+tab';
    }
    if (/^f\d{1,2}$/.test(rawKey)) {
        return shiftKey ? `shift+${rawKey}` : rawKey;
    }
    if (shiftKey && /^[A-Z]$/.test(String(key || ''))) {
        return `shift+${rawKey}`;
    }
    return rawKey;
}
