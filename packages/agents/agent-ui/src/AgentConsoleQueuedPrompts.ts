import { formatAgentUiNotice } from './agent-ui.i18n';
import { isAgentConsoleExactCommandToken } from './AgentConsoleSuggestions';

export interface AgentConsoleQueuedPrompt { input: string; attachments: any[]; command?: boolean; }
export interface AgentConsoleQueuedPromptHost {
    [key: string]: any;
}

export function enqueuePrompt(host: AgentConsoleQueuedPromptHost, input: string): void {
    const sessionId = host.state.sessionId;
    const queue = host.queuedPrompts.get(sessionId) || [];
    const command = input.trim().startsWith('/');
    queue.push({ input, attachments: command ? [] : host.state.pendingAttachments.slice(), command });
    host.queuedPrompts.set(sessionId, queue);
    host.state.setInput('');
    host.state.clearPendingAttachments();
    host.state.setQueuedPromptCount(queue.length);
    const noticeKey = command ? 'queuedCommand' : 'queuedPrompt';
    host.notify(formatAgentUiNotice(host.translator, noticeKey, { count: queue.length }));
}

export function queueDraft(host: AgentConsoleQueuedPromptHost): boolean {
    // An open menu owns Tab; only an exact command keeps mid-turn queueing.
    if (host.state.selectMenu && !isAgentConsoleExactCommandToken(host.state.input, host.state.inputCursor, host.state.commandHints)) return false;
    // While idle, Tab re-opens completion for an active `/` or `@` token when the menu is closed (Esc).
    if (!host.isTurnInProgress() && host.state.reopenInputSuggestions()) return true;
    if (!host.isTurnInProgress() || !host.state.input.trim()) return false;
    enqueuePrompt(host, host.state.input);
    return true;
}

export async function drainQueuedPrompts(host: AgentConsoleQueuedPromptHost, sessionId: string): Promise<void> {
    if (host.destroyed || host.drainingQueuedSessions.has(sessionId) || host.state.sessionId !== sessionId) return;
    host.drainingQueuedSessions.add(sessionId);
    try {
        const queue = host.queuedPrompts.get(sessionId) || [];
        while (queue.length && host.state.sessionId === sessionId && !host.isTurnInProgress()) {
            const next = queue.shift()!;
            host.state.setQueuedPromptCount(queue.length);
            host.state.setInput(next.input, next.input.length);
            host.state.setPendingAttachments(next.attachments);
            await host.submit();
        }
        if (!queue.length) host.queuedPrompts.delete(sessionId);
    } finally {
        host.drainingQueuedSessions.delete(sessionId);
    }
}
