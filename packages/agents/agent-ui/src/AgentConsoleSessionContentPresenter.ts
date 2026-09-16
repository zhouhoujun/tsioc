import { AgentMessage, getAgentMessageImageParts } from '@tsdi/agent';

export type AgentConsoleContentFamily = 'conversation' | 'execution' | 'decision' | 'artifact' | 'diagnostic';
export type AgentConsoleContentKind = 'user' | 'assistant-final' | 'assistant-partial' | 'assistant-preamble' | 'thought' | 'tool'
    | 'command' | 'question' | 'approval' | 'plan' | 'file-change' | 'attachment'
    | 'error' | 'warning' | 'cancelled' | 'system';

export interface AgentConsoleSessionContentPresentation {
    family: AgentConsoleContentFamily;
    kind: AgentConsoleContentKind;
    title: string;
    summary: string;
    meta: string[];
    detailRef?: string;
    priority: 'primary' | 'active' | 'supporting';
    causalKey?: string;
    defaultExpanded: boolean;
}

export function presentAgentConsoleSessionContent(message: AgentMessage): AgentConsoleSessionContentPresentation {
    const metadata = message?.metadata || {};
    const uiKind = String(metadata.uiKind || '').trim();
    const eventType = String(metadata.uiEventType || '').trim();
    const status = String(metadata.status || '').trim();
    const summary = firstMeaningfulLine(message?.content);
    const causalKey = clean(metadata.causalKey || metadata.uiEventKey);
    const detailRef = clean(metadata.detailRef || (uiKind === 'event' ? message.id : undefined));
    const meta = [clean(metadata.durationMs != null ? `${metadata.durationMs}ms` : ''), clean(status)].filter(Boolean) as string[];

    if (message.role === 'user') return result('conversation', 'user', 'Request', summary, 'primary', true);
    if (uiKind === 'plan-todo') return result('artifact', 'plan', 'Plan', summary, 'active', true);
    if (uiKind === 'file-change') return result('artifact', 'file-change', 'Files changed', summary, 'supporting', false);
    if (uiKind === 'command-execution' || metadata.type === 'shell') {
        return result('execution', 'command', clean(metadata.command) || 'Command', summary, status === 'running' ? 'active' : 'supporting', status === 'running');
    }
    if (eventType === 'reasoning' || metadata.reasoning === true) {
        return result('execution', 'thought', 'Thought', summary, status === 'running' ? 'active' : 'supporting', status === 'running');
    }
    if (eventType === 'approval' || eventType === 'approval_request' || uiKind === 'approval') {
        return result('decision', 'approval', 'Approval required', summary, 'active', true);
    }
    if (eventType === 'question' || eventType === 'ask_user' || uiKind === 'question') {
        return result('decision', 'question', 'Question', summary, 'active', true);
    }
    if (uiKind === 'event' && (eventType.startsWith('tool_') || metadata.timeline?.toolCallId)) {
        return result('execution', 'tool', clean(metadata.uiEventLabel) || 'Tool', summary, status === 'running' ? 'active' : 'supporting', status === 'running');
    }
    if (metadata.error || status === 'error' || status === 'failed') {
        return result('diagnostic', 'error', 'Error', summary, 'active', true);
    }
    if (status === 'cancelled') return result('diagnostic', 'cancelled', 'Cancelled', summary, 'supporting', true);
    if (metadata.warning) return result('diagnostic', 'warning', 'Warning', summary, 'supporting', true);
    const hasAttachment = getAgentMessageImageParts(message).length > 0
        || (message.parts || []).some(part => part?.type === 'file');
    if (hasAttachment && !summary) {
        return result('artifact', 'attachment', 'Attachment', '', 'supporting', true);
    }
    if (message.role === 'assistant') {
        const preamble = metadata.preamble === true || metadata.conversationPhase === 'preamble'
            || (Array.isArray(metadata.toolCalls) && metadata.toolCalls.length > 0);
        if (preamble) {
            return result('conversation', 'assistant-preamble', 'Preamble', summary, 'supporting', true);
        }
        const partial = metadata.streaming === true || metadata.partial === true || metadata.conversationPhase === 'partial';
        return result('conversation', partial ? 'assistant-partial' : 'assistant-final', partial ? 'Response in progress' : 'Response', summary, partial ? 'active' : 'primary', true);
    }
    if (message.role === 'tool') return result('execution', 'tool', clean(message.name) || 'Tool', summary, 'supporting', false);
    return result('diagnostic', 'system', 'System', summary, 'supporting', false);

    function result(
        family: AgentConsoleContentFamily,
        kind: AgentConsoleContentKind,
        title: string,
        value: string,
        priority: AgentConsoleSessionContentPresentation['priority'],
        defaultExpanded: boolean
    ): AgentConsoleSessionContentPresentation {
        return { family, kind, title, summary: value, meta, detailRef, priority, causalKey, defaultExpanded };
    }
}

/**
 * Derive the readable conversation mainline without changing persisted messages.
 * User messages delimit turns. Within each turn there is at most one final
 * assistant response; completed finals replace streaming partials, exact replay
 * duplicates collapse, and earlier distinct assistant text is retained as a
 * lower-priority preamble.
 */
export function projectAgentConsoleConversationMainline(messages: AgentMessage[]): AgentMessage[] {
    const projected: AgentMessage[] = [];
    let turn: AgentMessage[] = [];
    const flushTurn = (): void => {
        if (!turn.length) return;
        projected.push(...projectConversationTurn(turn));
        turn = [];
    };
    for (const message of Array.isArray(messages) ? messages : []) {
        if (isRoutineTurnStart(message)) continue;
        if (message.role === 'user') {
            flushTurn();
            turn.push(message);
            continue;
        }
        turn.push(message);
    }
    flushTurn();
    return projected;
}

/** Normalize execution content and keep the final answer after its turn work. */
export function projectAgentConsoleExecutionMainline(messages: AgentMessage[]): AgentMessage[] {
    const projected: AgentMessage[] = [];
    let turn: AgentMessage[] = [];
    const flushTurn = (): void => {
        if (!turn.length) return;
        projected.push(...projectExecutionTurn(turn));
        turn = [];
    };
    for (const message of Array.isArray(messages) ? messages : []) {
        if (message.role === 'user') {
            flushTurn();
            turn.push(message);
        } else {
            turn.push(message);
        }
    }
    flushTurn();
    return projected;
}

function projectExecutionTurn(messages: AgentMessage[]): AgentMessage[] {
    if (!messages.some(message => message.role === 'user')) return messages.slice();
    const lastThoughtIndex = findLastIndex(messages, isThoughtMessage);
    const finalMessages: AgentMessage[] = [];
    const body: AgentMessage[] = [];
    messages.forEach((message, index) => {
        if (isThoughtMessage(message)) {
            if (index === lastThoughtIndex) body.push(presentThoughtMainline(message));
            return;
        }
        if (isCommandMessage(message)) {
            body.push(presentCommandMainline(message));
            return;
        }
        if (presentAgentConsoleSessionContent(message).kind === 'assistant-final') {
            finalMessages.push(message);
            return;
        }
        body.push(message);
    });
    return [...body, ...finalMessages];
}

function presentThoughtMainline(message: AgentMessage): AgentMessage {
    const metadata = message.metadata || {};
    const running = String(metadata.status || '').toLowerCase() === 'running';
    const content = running ? firstMeaningfulLine(message.content) : summarizeExecutionText(message.content, 120);
    return {
        ...message,
        content: content || 'Thought',
        metadata: { ...metadata, detailRef: metadata.detailRef || message.id, executionSummary: true }
    };
}

function presentCommandMainline(message: AgentMessage): AgentMessage {
    const metadata = message.metadata || {};
    const command = [clean(metadata.command), clean(metadata.args)].filter(Boolean).join(' ') || 'Command';
    const status = String(metadata.status || '').toLowerCase();
    const statusLabel = status === 'succeeded' || status === 'success' ? 'completed'
        : status === 'failed' || status === 'error' ? 'failed'
            : status === 'cancelled' ? 'cancelled' : 'running';
    const error = tailSummary(metadata.error, 160);
    const outputIds = Array.isArray(metadata.outputIds) ? metadata.outputIds.filter(Boolean) : [];
    return {
        ...message,
        content: `${command} ${statusLabel}${error ? `: ${error}` : ''}`,
        metadata: { ...metadata, detailRef: metadata.detailRef || outputIds[0], executionSummary: true }
    };
}

function isThoughtMessage(message: AgentMessage): boolean {
    const metadata = message?.metadata || {};
    return metadata.reasoning === true || String(metadata.uiEventType || '').toLowerCase() === 'reasoning';
}

function isCommandMessage(message: AgentMessage): boolean {
    const metadata = message?.metadata || {};
    return metadata.uiKind === 'command-execution' || metadata.type === 'shell';
}

function findLastIndex(messages: AgentMessage[], predicate: (message: AgentMessage) => boolean): number {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (predicate(messages[index])) return index;
    }
    return -1;
}

function summarizeExecutionText(value: unknown, maxLength: number): string {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(1, maxLength - 3)).trimEnd()}...`;
}

function tailSummary(value: unknown, maxLength: number): string {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return `...${text.slice(-(maxLength - 3)).trimStart()}`;
}

function projectConversationTurn(messages: AgentMessage[]): AgentMessage[] {
    if (!messages.some(message => message.role === 'user')) return messages.slice();
    const conversationIndexes: number[] = [];
    const finalIndexes: number[] = [];
    const partialIndexes: number[] = [];
    messages.forEach((message, index) => {
        if (message.role !== 'assistant' || isNonConversationAssistant(message)) return;
        const kind = presentAgentConsoleSessionContent(message).kind;
        if (kind !== 'assistant-final' && kind !== 'assistant-partial' && kind !== 'assistant-preamble') return;
        conversationIndexes.push(index);
        if (kind === 'assistant-final') finalIndexes.push(index);
        else if (kind === 'assistant-partial') partialIndexes.push(index);
    });
    if (!conversationIndexes.length) return messages.slice();

    const conversationIndexSet = new Set(conversationIndexes);
    const finalIndex = finalIndexes.length ? finalIndexes[finalIndexes.length - 1] : -1;
    const partialIndex = finalIndex < 0 && partialIndexes.length ? partialIndexes[partialIndexes.length - 1] : -1;
    const seenFinalContent = new Set<string>();
    const result: AgentMessage[] = [];
    messages.forEach((message, index) => {
        if (!conversationIndexSet.has(index)) {
            result.push(message);
            return;
        }
        const kind = presentAgentConsoleSessionContent(message).kind;
        if (kind === 'assistant-partial') {
            if (index === partialIndex) result.push(message);
            return;
        }
        if (kind === 'assistant-preamble') {
            result.push(message);
            return;
        }
        const contentKey = normalizedConversationContent(message);
        if (index === finalIndex) {
            result.push(message);
            seenFinalContent.add(contentKey);
            return;
        }
        if (contentKey && normalizedConversationContent(messages[finalIndex]) === contentKey) return;
        if (contentKey && seenFinalContent.has(contentKey)) return;
        result.push({
            ...message,
            metadata: { ...(message.metadata || {}), conversationPhase: 'preamble' }
        });
        if (contentKey) seenFinalContent.add(contentKey);
    });
    return result;
}

function isRoutineTurnStart(message: AgentMessage): boolean {
    const metadata = message?.metadata || {};
    const eventType = String(metadata.uiEventType || '').toLowerCase();
    const status = String(metadata.status || '').toLowerCase();
    return metadata.uiKind === 'event'
        && (eventType === 'turn_started' || (eventType === 'turn' && status === 'running'));
}

function isNonConversationAssistant(message: AgentMessage): boolean {
    const metadata = message?.metadata || {};
    return metadata.uiKind === 'event'
        || metadata.uiKind === 'plan-todo'
        || metadata.uiKind === 'file-change'
        || metadata.uiKind === 'command-execution'
        || metadata.error === true;
}

function normalizedConversationContent(message?: AgentMessage): string {
    if (!message) return '';
    const parts = (message.parts || []).map(part => part.type === 'text'
        ? `text:${part.text}`
        : `${part.type}:${part.name || ''}:${part.type === 'image' ? part.imageUrl : part.dataUrl}`);
    return `${String(message.content || '').replace(/\s+/g, ' ').trim()}|${parts.join('|')}`;
}

function firstMeaningfulLine(value: unknown): string {
    return String(value || '').split(/\r?\n/).map(line => line.trim()).find(Boolean) || '';
}

function clean(value: unknown): string | undefined {
    const text = String(value || '').trim();
    return text || undefined;
}
