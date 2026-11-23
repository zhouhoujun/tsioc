import { formatAgentUiNotice } from './agent-ui.i18n';
import { isAgentConsoleExactCommandToken } from './AgentConsoleSuggestions';

export interface AgentConsoleQueuedPrompt { input: string; attachments: any[]; command?: boolean; itemId?: string; }

/** Persist the queue through the gateway RPC or the in-process runtime. */
export function persistQueuedPrompts(host: AgentConsoleQueuedPromptHost, sessionId: string, queue: AgentConsoleQueuedPrompt[]): void {
    const items = queue.map((entry, index) => ({
        itemId: entry.itemId || `${sessionId}:${index}:${Date.now()}`,
        kind: entry.command ? 'command' : 'user',
        state: 'queued',
        payload: { input: entry.input, attachments: entry.attachments, command: entry.command === true }
    }));
    const request = host.appRpc?.request
        ? host.appRpc.request('session.inbox.replace', { sessionId, items }, host.rpcRequestContext?.())
        : host.runtime?.replaceSessionInbox?.(sessionId, items);
    void Promise.resolve(request).catch(() => undefined);
}
export interface AgentConsoleQueuedPromptHost {
    [key: string]: any;
}

export function enqueuePrompt(
    host: AgentConsoleQueuedPromptHost,
    input: string,
    options: { priority?: boolean } = {}
): void {
    const sessionId = host.state.sessionId;
    const queue = (host.queuedPrompts.get(sessionId) || []).slice();
    const command = input.trim().startsWith('/');
    const entry = { input, attachments: command ? [] : host.state.pendingAttachments.slice(), command };
    // Ctrl+X Enter: run this draft as the next follow-up (front of the queue)
    // instead of after prompts queued earlier. Queue order is the only thing
    // that changes; the running turn is never interrupted.
    if (options.priority) {
        queue.unshift(entry);
    } else {
        queue.push(entry);
    }
    host.queuedPrompts.set(sessionId, queue);
    persistQueuedPrompts(host, sessionId, queue);
    host.state.setInput('');
    host.state.clearPendingAttachments();
    host.state.setQueuedPromptCount(queue.length);
    const noticeKey = options.priority
        ? 'queuedPromptPriority'
        : command ? 'queuedCommand' : 'queuedPrompt';
    host.notify(formatAgentUiNotice(host.translator, noticeKey, { count: queue.length }));
}

/**
 * Priority queue key path: only while a turn is running and the draft is not
 * empty. Returns false otherwise so the same chord can fall through to other
 * handlers when idle.
 */
export function queuePriorityDraft(host: AgentConsoleQueuedPromptHost): boolean {
    if (!host.isTurnInProgress() || !host.state.input.trim()) {
        return false;
    }
    enqueuePrompt(host, host.state.input, { priority: true });
    return true;
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
            persistQueuedPrompts(host, sessionId, queue);
            host.state.setInput(next.input, next.input.length);
            host.state.setPendingAttachments(next.attachments);
            await host.submit();
        }
        if (!queue.length) {
            host.queuedPrompts.delete(sessionId);
        }
        persistQueuedPrompts(host, sessionId, queue);
    } finally {
        host.drainingQueuedSessions.delete(sessionId);
    }
}
