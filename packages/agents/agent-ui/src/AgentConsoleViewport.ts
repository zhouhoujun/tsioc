import type { AgentMessage } from '@tsdi/agent';

/** Transcript layout. `viewport` windows to the terminal; `stream` uses native scrollback. */
export type AgentConsoleMessageLayout = 'stream' | 'viewport';

/** Normalize a persisted/option value; the legacy `dynamic` alias maps to `viewport`. */
export function normalizeMessageLayout(value: unknown): AgentConsoleMessageLayout {
    return value === 'stream' ? 'stream' : 'viewport';
}

/** Id of the last assistant answer row; kept expanded in viewport mode while other bodies collapse. */
export function resolveFinalAssistantMessageId(messages: readonly AgentMessage[]): string {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (String(message?.role || '').toLowerCase() !== 'assistant') {
            continue;
        }
        if (message?.metadata?.uiKind === 'event') {
            continue;
        }
        return String(message.id || '');
    }
    return '';
}
