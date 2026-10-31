/**
 * Key vs text disambiguation for panel filters (`/sessions` search, `/outputs`
 * filter). The terminal reports fast typing and paste as a single multi-char
 * chunk, while named keys arrive as words; filters must accept the former and
 * ignore the latter.
 */

const AGENT_CONSOLE_KEY_NAMES = new Set([
    'esc', 'escape', 'backspace', 'delete', 'del', 'enter', 'return', 'tab',
    'up', 'down', 'left', 'right', 'pageup', 'pagedown', 'home', 'end',
    'insert', 'space', 'copy', 'paste', 'wheel'
]);

/**
 * Printable text carried by a key event, or `undefined` when the key is a name
 * (`down`, `ctrl+x`, `esc`…). Single characters are returned as-is so callers
 * can keep their per-key behaviour.
 */
export function agentConsoleTextChunk(key: string): string | undefined {
    const text = String(key || '');
    if (!text || /[\x00-\x1f]/.test(text)) {
        return undefined;
    }
    const lower = text.toLowerCase();
    if (AGENT_CONSOLE_KEY_NAMES.has(lower)) {
        return undefined;
    }
    // Named chord (`ctrl+x`, `shift+g`) rather than typed text.
    if (/^[a-z]+(?:\+[a-z0-9]+)+$/.test(lower)) {
        return undefined;
    }
    return text;
}
