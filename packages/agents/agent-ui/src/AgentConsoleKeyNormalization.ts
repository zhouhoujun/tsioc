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
    // Modifier combinations name arrows without the `arrow` prefix so they can
    // resolve keymap entries such as `ctrl+alt+left`; bare arrows keep the
    // prefix for the navigation fallback in the global key controller.
    const namedKey = rawKey.startsWith('arrow') ? rawKey.slice(5) : rawKey;
    if (ctrlKey) {
        return altKey ? `ctrl+alt+${namedKey}` : shiftKey ? `ctrl+shift+${namedKey}` : `ctrl+${namedKey}`;
    }
    if (altKey) {
        return shiftKey ? `alt+shift+${namedKey}` : `alt+${namedKey}`;
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
