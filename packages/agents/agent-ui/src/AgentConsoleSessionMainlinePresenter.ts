import type { AgentMessage } from '@tsdi/agent';
import { presentAgentConsoleSessionContent } from './AgentConsoleSessionContentPresenter';
import {
    backgroundKey,
    bindArtifactCause,
    clean,
    decisionKey,
    decisionKind,
    decisionStatus,
    diagnosticKey,
    diagnosticSeverity,
    eventLifecycle,
    findLastIndex,
    finiteNumber,
    hasAttachment,
    isCancelledDiagnostic,
    isCommandMessage,
    isNonConversationAssistant,
    isSupersededConversationSnapshot,
    isThoughtMessage,
    normalizedConversationContent,
    presentCommandMainline,
    presentThoughtMainline,
    projectConversationTurn,
    projectExecutionTurn,
    summarizeExecutionText,
    tailSummary
} from './AgentConsoleSessionContentPresenter';

export function projectAgentConsoleTimelineDurations(messages: AgentMessage[]): AgentMessage[] {
    const starts = new Map<string, number>();
    return (Array.isArray(messages) ? messages : []).map(message => {
        const metadata = message.metadata || {};
        if (metadata.uiKind !== 'event') return message;
        const createdAt = finiteNumber(message.createdAt, NaN);
        const eventType = String(metadata.uiEventType || '').toLowerCase();
        const lifecycle = eventLifecycle(eventType, metadata);
        if (lifecycle.phase === 'start' && Number.isFinite(createdAt)) {
            starts.set(lifecycle.key, createdAt);
            return message;
        }
        let durationMs = finiteNumber(metadata.durationMs, NaN);
        if (!Number.isFinite(durationMs)) {
            const startedAt = finiteNumber(metadata.startedAt, NaN);
            const completedAt = finiteNumber(metadata.completedAt ?? metadata.endedAt, NaN);
            if (Number.isFinite(startedAt) && Number.isFinite(completedAt)) {
                durationMs = Math.max(0, completedAt - startedAt);
            } else if (lifecycle.phase === 'end' && starts.has(lifecycle.key) && Number.isFinite(createdAt)) {
                durationMs = Math.max(0, createdAt - starts.get(lifecycle.key)!);
            }
        }
        if (!Number.isFinite(durationMs)) return message;
        if (lifecycle.phase === 'end') starts.delete(lifecycle.key);
        return { ...message, metadata: { ...metadata, durationMs } };
    });
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
