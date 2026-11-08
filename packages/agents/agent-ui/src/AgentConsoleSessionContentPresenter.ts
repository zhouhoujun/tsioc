import { AgentMessage, getAgentMessageImageParts } from '@tsdi/agent';

export type AgentConsoleContentFamily = 'conversation' | 'execution' | 'decision' | 'artifact' | 'diagnostic';
export type AgentConsoleContentKind = 'user' | 'assistant-final' | 'assistant-partial' | 'assistant-preamble' | 'thought' | 'tool'
    | 'command' | 'event' | 'question' | 'approval' | 'plan' | 'file-change' | 'attachment'
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
    if (uiKind === 'event') {
        return result('execution', 'event', clean(metadata.uiEventLabel) || eventTitle(eventType), summary,
            status === 'running' ? 'active' : 'supporting', false);
    }
    if (message.role === 'assistant') {
        const preamble = isAgentConsoleAssistantPreamble(message);
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
 * Assistant text that ran before the turn's final answer (narration attached
 * to tool calls, or an explicit preamble marker). Kept as one pure predicate so
 * the conversation projection, the role renderer and the worked/done footer all
 * agree on what is *not* a final reply.
 */
export function isAgentConsoleAssistantPreamble(message?: AgentMessage): boolean {
    const metadata = message?.metadata || {};
    const finishReason = String(metadata.finishReason || '').trim().toLowerCase();
    return metadata.preamble === true
        || String(metadata.conversationPhase || '').trim() === 'preamble'
        || (Array.isArray(metadata.toolCalls) && metadata.toolCalls.length > 0)
        // A persisted step message ends with `finishReason: tool_calls` (not
        // `stop`) because the turn continued with another model call. It is
        // interim narration even when its `toolCalls` were stripped on reload.
        || finishReason === 'tool_calls'
        || finishReason === 'tool_use'
        || finishReason === 'function_call';
}

/** Add display-only total duration to completed lifecycle events. */
export function backgroundKey(message: AgentMessage): string {
    const metadata = message.metadata || {};
    return clean(metadata.taskId || metadata.backgroundTaskId || metadata.uiEventKey) || message.id;
}

export function diagnosticKey(message: AgentMessage): string {
    const metadata = message.metadata || {};
    return clean(metadata.causalKey || metadata.toolCallId || metadata.planStepId || metadata.stepId || metadata.requestId)
        || `diagnostic:${message.id}`;
}

export function diagnosticSeverity(message: AgentMessage): number {
    const metadata = message.metadata || {};
    // Command failures stay in the execution family so their detail route can
    // continue to target captured output instead of the summary message.
    if (metadata.uiKind === 'command-execution' || metadata.type === 'shell') return 0;
    const eventType = String(metadata.uiEventType || '').toLowerCase();
    const status = String(metadata.status || '').toLowerCase();
    if (isCancelledDiagnostic(message)) return 1;
    if (metadata.error || status === 'error' || status === 'failed' || eventType === 'error' || eventType.endsWith('_failed')) return 3;
    if (metadata.warning || status === 'warning' || eventType === 'warning') return 2;
    return 0;
}

export function isCancelledDiagnostic(message: AgentMessage): boolean {
    const metadata = message.metadata || {};
    const eventType = String(metadata.uiEventType || '').toLowerCase();
    return String(metadata.status || '').toLowerCase() === 'cancelled' || eventType.endsWith('_cancelled');
}

export function decisionKind(message: AgentMessage): 'question' | 'approval' | undefined {
    const metadata = message.metadata || {};
    const uiKind = String(metadata.uiKind || '').toLowerCase();
    const eventType = String(metadata.uiEventType || '').toLowerCase();
    if (uiKind === 'question' || eventType === 'question' || eventType === 'ask_user') return 'question';
    if (uiKind === 'approval' || eventType === 'approval' || eventType === 'approval_request') return 'approval';
    return undefined;
}

export function decisionKey(message: AgentMessage, kind: 'question' | 'approval'): string {
    const metadata = message.metadata || {};
    return clean(metadata.questionId || metadata.approvalId || metadata.requestId || metadata.uiEventKey) || `${kind}:${message.id}`;
}

export function decisionStatus(value: unknown): 'pending' | 'answered' | 'approved' | 'denied' | 'expired' {
    const status = String(value || '').toLowerCase();
    if (status === 'answered' || status === 'approved' || status === 'denied' || status === 'expired') return status;
    if (status === 'rejected') return 'denied';
    return 'pending';
}

export function bindArtifactCause(message: AgentMessage): AgentMessage {
    const metadata = message.metadata || {};
    if (metadata.uiKind !== 'file-change' && !hasAttachment(message)) return message;
    const sourceMessageId = clean(metadata.sourceMessageId) || message.id;
    const stepId = clean(metadata.planStepId || metadata.stepId);
    return {
        ...message,
        metadata: {
            ...metadata,
            sourceMessageId,
            causalKey: clean(metadata.causalKey) || (stepId ? `step:${stepId}` : `message:${sourceMessageId}`)
        }
    };
}

export function hasAttachment(message: AgentMessage): boolean {
    return getAgentMessageImageParts(message).length > 0 || (message.parts || []).some(part => part?.type === 'file');
}

export function finiteNumber(value: unknown, fallback: number): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

export function eventTitle(eventType: string): string {
    const value = String(eventType || '').replace(/[._-]+/g, ' ').trim();
    return value ? value.replace(/^\w/, char => char.toUpperCase()) : 'Event';
}

export function eventLifecycle(eventType: string, metadata: Record<string, any>): {
    key: string;
    phase: 'start' | 'end' | 'instant';
} {
    const phase = /(?:_started|_invoked)$/.test(eventType) ? 'start'
        : /(?:_completed|_failed|_cancelled|_canceled)$/.test(eventType) ? 'end' : 'instant';
    const family = eventType.replace(/(?:_started|_invoked|_completed|_failed|_cancelled|_canceled)$/, '');
    const stableIdentity = clean(metadata.toolCallId || metadata.taskId || metadata.stepId
        || metadata.planStepId || metadata.turnId || metadata.timeline?.toolCallId
        || metadata.timeline?.taskId || metadata.timeline?.stepId);
    const eventKey = String(clean(metadata.uiEventKey) || '')
        .replace(/(?:[:._-](?:started|invoked|completed|failed|cancelled|canceled))$/, '');
    const identity = stableIdentity || (family === 'turn' ? 'current' : eventKey) || 'current';
    return { key: `${family}:${identity}`, phase };
}

export function projectExecutionTurn(messages: AgentMessage[]): AgentMessage[] {
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

export function presentThoughtMainline(message: AgentMessage): AgentMessage {
    const metadata = message.metadata || {};
    const running = String(metadata.status || '').toLowerCase() === 'running';
    const content = running ? firstMeaningfulLine(message.content) : String(message.content || '').trim(); // full text; the Thought template collapses it
    return {
        ...message,
        content: content || 'Thought',
        metadata: { ...metadata, detailRef: metadata.detailRef || message.id, executionSummary: true }
    };
}

export function presentCommandMainline(message: AgentMessage): AgentMessage {
    const metadata = message.metadata || {};
    // Local `!shell` rows carry the command *and* its output; collapsing them to
    // the slash-command echo (`<command> completed`) hides both.
    if (metadata.type === 'shell') {
        return message;
    }
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

export function isThoughtMessage(message: AgentMessage): boolean {
    const metadata = message?.metadata || {};
    return metadata.reasoning === true || String(metadata.uiEventType || '').toLowerCase() === 'reasoning';
}

export function isCommandMessage(message: AgentMessage): boolean {
    const metadata = message?.metadata || {};
    return metadata.uiKind === 'command-execution' || metadata.type === 'shell';
}

export function findLastIndex(messages: AgentMessage[], predicate: (message: AgentMessage) => boolean): number {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (predicate(messages[index])) return index;
    }
    return -1;
}

export function summarizeExecutionText(value: unknown, maxLength: number): string {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(1, maxLength - 3)).trimEnd()}...`;
}

export function tailSummary(value: unknown, maxLength: number): string {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return `...${text.slice(-(maxLength - 3)).trimStart()}`;
}

export function projectConversationTurn(messages: AgentMessage[]): AgentMessage[] {
    if (!messages.some(message => message.role === 'user')) return messages.slice();
    const kinds: Array<string | undefined> = messages.map(message =>
        message.role === 'assistant' && !isNonConversationAssistant(message)
            ? presentAgentConsoleSessionContent(message).kind
            : undefined);
    const conversationIndexes: number[] = [];
    const finalIndexes: number[] = [];
    const partialIndexes: number[] = [];
    kinds.forEach((kind, index) => {
        if (kind !== 'assistant-final' && kind !== 'assistant-partial' && kind !== 'assistant-preamble') return;
        conversationIndexes.push(index);
        if (kind === 'assistant-final') finalIndexes.push(index);
        else if (kind === 'assistant-partial') partialIndexes.push(index);
    });
    if (!conversationIndexes.length) return messages.slice();

    const conversationIndexSet = new Set(conversationIndexes);
    const finalIndex = finalIndexes.length ? finalIndexes[finalIndexes.length - 1] : -1;
    const partialIndex = finalIndex < 0 && partialIndexes.length ? partialIndexes[partialIndexes.length - 1] : -1;
    const finalContent = finalIndex >= 0 ? normalizedConversationContent(messages[finalIndex]) : '';
    const seenFinalContent = new Set<string>();
    const result: AgentMessage[] = [];
    messages.forEach((message, index) => {
        if (!conversationIndexSet.has(index)) {
            result.push(message);
            return;
        }
        const kind = kinds[index];
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
            if (contentKey) seenFinalContent.add(contentKey);
            return;
        }
        if (contentKey && finalContent === contentKey) return;
        if (contentKey && isSupersededConversationSnapshot(message, finalContent)) return;
        if (contentKey && seenFinalContent.has(contentKey)) return;
        result.push({
            ...message,
            metadata: { ...(message.metadata || {}), conversationPhase: 'preamble' }
        });
        if (contentKey) seenFinalContent.add(contentKey);
    });
    return result;
}

export function isSupersededConversationSnapshot(message: AgentMessage, finalContent: string): boolean {
    const earlier = normalizedConversationContent(message);
    if (!earlier || !finalContent) return false;
    if (finalContent.startsWith(earlier)) return true;

    // Persisted stream snapshots can contain list markers whose text only
    // arrives in the completed message. Match their substantial prose instead
    // of treating the incomplete snapshot as a separate preamble.
    const substantialLines = String(message.content || '')
        .replace(/\r/g, '')
        .split('\n')
        .map(line => line.replace(/^\s*(?:[-*+]\s*|\d+\.\s*)/, '').replace(/\s+/g, ' ').trim())
        .filter(line => line.length >= 32);
    return substantialLines.some(line => finalContent.includes(line));
}

export function isNonConversationAssistant(message: AgentMessage): boolean {
    const metadata = message?.metadata || {};
    return metadata.uiKind === 'event'
        || metadata.uiKind === 'plan-todo'
        || metadata.uiKind === 'file-change'
        || metadata.uiKind === 'command-execution'
        || metadata.error === true;
}

export function normalizedConversationContent(message?: AgentMessage): string {
    if (!message) return '';
    const parts = (message.parts || []).map(part => part.type === 'text'
        ? `text:${part.text}`
        : `${part.type}:${part.name || ''}:${part.type === 'image' ? part.imageUrl : part.dataUrl}`);
    return `${String(message.content || '').replace(/\s+/g, ' ').trim()}|${parts.join('|')}`;
}

export function firstMeaningfulLine(value: unknown): string {
    return String(value || '').split(/\r?\n/).map(line => line.trim()).find(Boolean) || '';
}

export function clean(value: unknown): string | undefined {
    const text = String(value || '').trim();
    return text || undefined;
}

export {
    projectAgentConsoleArtifactMainline,
    projectAgentConsoleConversationMainline,
    projectAgentConsoleDecisionMainline,
    projectAgentConsoleDiagnosticMainline,
    projectAgentConsoleExecutionMainline,
    projectAgentConsoleTimelineDurations
} from './AgentConsoleSessionMainlinePresenter';
