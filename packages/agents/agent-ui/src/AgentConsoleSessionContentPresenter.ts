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

/** Keep one causal artifact per plan revision and remove plan status restatements. */
export function projectAgentConsoleArtifactMainline(messages: AgentMessage[]): AgentMessage[] {
    const input = Array.isArray(messages) ? messages : [];
    const plans = new Map<string, { revision: number; index: number }>();
    input.forEach((message, index) => {
        if (message.metadata?.uiKind !== 'plan-todo') return;
        const planId = clean(message.metadata.planId) || message.id;
        const revision = finiteNumber(message.metadata.planRevision, 0);
        const current = plans.get(planId);
        if (!current || revision > current.revision || (revision === current.revision && index > current.index)) {
            plans.set(planId, { revision, index });
        }
    });
    const activePlans = new Set(plans.keys());
    return input.filter((message, index) => {
        const metadata = message.metadata || {};
        if (metadata.uiKind === 'plan-todo') {
            const planId = clean(metadata.planId) || message.id;
            return plans.get(planId)?.index === index;
        }
        if (metadata.uiKind !== 'event') return true;
        const planId = clean(metadata.planId || metadata.timeline?.planId);
        const stepId = clean(metadata.planStepId || metadata.stepId || metadata.timeline?.stepId);
        if (!stepId) return true;
        if (planId) return !activePlans.has(planId);
        return activePlans.size === 0;
    }).map(message => bindArtifactCause(message));
}

/** Project each question or approval as one stable pending/resolved checkpoint. */
export function projectAgentConsoleDecisionMainline(messages: AgentMessage[]): AgentMessage[] {
    const input = Array.isArray(messages) ? messages : [];
    const canonical = new Map<string, number>();
    input.forEach((message, index) => {
        const kind = decisionKind(message);
        if (!kind || message.metadata?.uiKind === 'event') return;
        canonical.set(decisionKey(message, kind), index);
    });
    return input.reduce<AgentMessage[]>((result, message, index) => {
        const kind = decisionKind(message);
        if (!kind) {
            result.push(message);
            return result;
        }
        const key = decisionKey(message, kind);
        if (message.metadata?.uiKind === 'event') {
            if (!canonical.has(key)) result.push(message);
            return result;
        }
        if (canonical.get(key) !== index) return result;
        const metadata = message.metadata || {};
        const status = decisionStatus(metadata.status);
        const subject = clean(metadata.question || metadata.summary || message.content) || (kind === 'question' ? 'Question' : 'Approval');
        const answer = clean(metadata.answer || metadata.decision);
        const scope = clean(metadata.scope);
        const content = status === 'pending'
            ? subject
            : `${subject} - ${status}${answer ? `: ${answer}` : ''}${scope ? ` (${scope})` : ''}`;
        result.push({
            ...message,
            content,
            metadata: { ...metadata, uiKind: kind, status, decisionKey: key, causalKey: clean(metadata.causalKey) || `decision:${key}` }
        });
        return result;
    }, []);
}

/** Collapse diagnostic and background lifecycles while retaining causal detail metadata. */
export function projectAgentConsoleDiagnosticMainline(messages: AgentMessage[]): AgentMessage[] {
    const input = Array.isArray(messages) ? messages : [];
    const latestBackground = new Map<string, { index: number; rank: number }>();
    const strongestDiagnostic = new Map<string, { index: number; severity: number }>();
    input.forEach((message, index) => {
        const metadata = message.metadata || {};
        const eventType = String(metadata.uiEventType || '').toLowerCase();
        if (eventType.startsWith('background_task_')) {
            const key = backgroundKey(message);
            const rank = eventType.endsWith('_failed') ? 4 : eventType.endsWith('_cancelled') ? 3
                : eventType.endsWith('_completed') ? 2 : 1;
            const current = latestBackground.get(key);
            if (!current || rank > current.rank || (rank === current.rank && index > current.index)) {
                latestBackground.set(key, { index, rank });
            }
            return;
        }
        const severity = diagnosticSeverity(message);
        if (!severity) return;
        const key = diagnosticKey(message);
        const current = strongestDiagnostic.get(key);
        if (!current || severity > current.severity || (severity === current.severity && index > current.index)) {
            strongestDiagnostic.set(key, { index, severity });
        }
    });
    return input.reduce<AgentMessage[]>((result, message, index) => {
        const metadata = message.metadata || {};
        const eventType = String(metadata.uiEventType || '').toLowerCase();
        const relatedTaskId = clean(metadata.taskId || metadata.backgroundTaskId);
        if (!eventType.startsWith('background_task_') && relatedTaskId && latestBackground.has(relatedTaskId)) {
            return result;
        }
        if (eventType.startsWith('background_task_')) {
            const key = backgroundKey(message);
            if (latestBackground.get(key)?.index !== index) return result;
            const status = eventType.endsWith('_failed') ? 'failed'
                : eventType.endsWith('_completed') ? 'completed'
                    : eventType.endsWith('_cancelled') ? 'cancelled' : 'running';
            const owner = clean(metadata.owner || metadata.agentId);
            const goal = clean(metadata.goal || metadata.task || message.content) || 'Background task';
            const outcome = clean(metadata.summary || metadata.error || metadata.result);
            result.push({
                ...message,
                content: `${owner ? `${owner}: ` : ''}${goal} - ${status}${outcome ? `: ${outcome}` : ''}`,
                metadata: { ...metadata, status, taskId: key, causalKey: clean(metadata.causalKey) || `background:${key}`,
                    detailRef: clean(metadata.detailRef) || key, backgroundSummary: true }
            });
            return result;
        }
        const severity = diagnosticSeverity(message);
        if (!severity) {
            result.push(message);
            return result;
        }
        const key = diagnosticKey(message);
        if (strongestDiagnostic.get(key)?.index !== index) return result;
        const cancelled = isCancelledDiagnostic(message);
        const rootCause = clean(metadata.rootCause || (typeof metadata.error === 'string' ? metadata.error : '') || metadata.message || message.content)
            || (cancelled ? 'Operation cancelled' : 'Unknown error');
        result.push({
            ...message,
            content: rootCause,
            metadata: { ...metadata, status: cancelled ? 'cancelled' : severity >= 3 ? 'error' : 'warning',
                causalKey: clean(metadata.causalKey) || key, detailRef: clean(metadata.detailRef) || message.id,
                diagnosticSummary: true }
        });
        return result;
    }, []);
}

function backgroundKey(message: AgentMessage): string {
    const metadata = message.metadata || {};
    return clean(metadata.taskId || metadata.backgroundTaskId || metadata.uiEventKey) || message.id;
}

function diagnosticKey(message: AgentMessage): string {
    const metadata = message.metadata || {};
    return clean(metadata.causalKey || metadata.toolCallId || metadata.planStepId || metadata.stepId || metadata.requestId)
        || `diagnostic:${message.id}`;
}

function diagnosticSeverity(message: AgentMessage): number {
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

function isCancelledDiagnostic(message: AgentMessage): boolean {
    const metadata = message.metadata || {};
    const eventType = String(metadata.uiEventType || '').toLowerCase();
    return String(metadata.status || '').toLowerCase() === 'cancelled' || eventType.endsWith('_cancelled');
}

function decisionKind(message: AgentMessage): 'question' | 'approval' | undefined {
    const metadata = message.metadata || {};
    const uiKind = String(metadata.uiKind || '').toLowerCase();
    const eventType = String(metadata.uiEventType || '').toLowerCase();
    if (uiKind === 'question' || eventType === 'question' || eventType === 'ask_user') return 'question';
    if (uiKind === 'approval' || eventType === 'approval' || eventType === 'approval_request') return 'approval';
    return undefined;
}

function decisionKey(message: AgentMessage, kind: 'question' | 'approval'): string {
    const metadata = message.metadata || {};
    return clean(metadata.questionId || metadata.approvalId || metadata.requestId || metadata.uiEventKey) || `${kind}:${message.id}`;
}

function decisionStatus(value: unknown): 'pending' | 'answered' | 'approved' | 'denied' | 'expired' {
    const status = String(value || '').toLowerCase();
    if (status === 'answered' || status === 'approved' || status === 'denied' || status === 'expired') return status;
    if (status === 'rejected') return 'denied';
    return 'pending';
}

function bindArtifactCause(message: AgentMessage): AgentMessage {
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

function hasAttachment(message: AgentMessage): boolean {
    return getAgentMessageImageParts(message).length > 0 || (message.parts || []).some(part => part?.type === 'file');
}

function finiteNumber(value: unknown, fallback: number): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
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
