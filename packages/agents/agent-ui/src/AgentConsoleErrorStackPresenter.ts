import { getGlobalProcess } from './global-process';

/**
 * `TSDI_AGENT_DEBUG` is the repo-wide diagnostic switch; `agent-cli`'s
 * `isCliDebugEnabled` reads the same key. Agent UI cannot import it from there —
 * the dependency runs the other way (CLI boots the UI) — so the key is read here
 * through the cross-platform `globalThis` guard instead of `process`.
 */
export function isAgentDebugEnabled(env = getGlobalProcess()?.env): boolean {
    const value = env?.TSDI_AGENT_DEBUG;
    return value === '1' || value === 'true';
}

/**
 * Appends the throw-site stack to an already-presented failure message.
 *
 * A stack is diagnostic output rather than translatable copy, so it bypasses i18n
 * exactly like raw tool output does; only the presented `message` is localized.
 * Failed/error rows already stay expanded so the cause is visible, so the frames
 * need no extra interaction to read.
 *
 * V8 repeats `Name: message` as the stack's first line. That line is dropped when it
 * merely restates `message`, which is already on screen, to avoid printing the same
 * sentence twice.
 */
export function withErrorStack(message: string, error: unknown, debug = isAgentDebugEnabled()): string {
    if (!debug || !(error instanceof Error)) {
        return message;
    }
    const trimmed = String(error.stack || '').trim();
    if (!trimmed) {
        return message;
    }
    const lines = trimmed.split('\n');
    const first = lines[0] ?? '';
    if (first && (first.includes(message) || message.includes(first))) {
        lines.shift();
    }
    return lines.length ? `${message}\n${lines.join('\n')}` : message;
}
