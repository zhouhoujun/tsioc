import type { AgentMessage } from '@tsdi/agent';
import type { AgentConsoleActivity, AgentConsoleApprovalRequest, AgentConsoleUiEventOptions } from './AgentConsoleSessionState';
import {
    describePendingToolCall,
    describeStreamEventContent,
    resolveStreamEventLabel,
    resolveToolEventKey
} from './AgentConsoleStreamHelpers';
import { replaceStreamingAssistantMessage } from './AgentConsoleMessageState';

/**
 * Host surface required by the turn stream controller.
 * The component satisfies this interface structurally when delegating.
 */
export interface AgentConsoleTurnStreamHost {
    state: {
        sessionId: string;
        messages: AgentMessage[];
        setMessages(messages: AgentMessage[], ...rest: any[]): void;
        setTokenUsage(usage?: unknown): void;
        setStatus(status: string): void;
        setContextPreparation(report?: unknown): void;
        pushActivity(kind: AgentConsoleActivity['kind'], message: string): void;
        summarize(value: string): string;
        qualifyUiEventKey(key: string): string;
        appendUiEventMessage(content: string, options?: AgentConsoleUiEventOptions): void;
        upsertUiEventMessage(eventKey: string, content: string, options?: AgentConsoleUiEventOptions): void;
        upsertPendingApproval(request: AgentConsoleApprovalRequest): void;
        requestApprovalAttention(): void;
    };
    destroyed?: boolean;
    translator?: unknown;
    updateTerminalTitle(): void;
    scheduleStreamingAssistantMessageFlush(message: AgentMessage): void;
    refreshTodoPlan(): Promise<void>;
    refreshPendingApprovals(): Promise<void>;
}

/**
 * Normalize a stream event status into the UI status vocabulary.
 * Unknown/empty values fall back to `running`.
 */
export function normalizeUiEventStatus(status: unknown): 'running' | 'success' | 'failed' | 'error' {
    switch (String(status || '').trim()) {
        case 'success':
        case 'failed':
        case 'error':
            return status as 'success' | 'failed' | 'error';
        case 'cancelled':
            return 'failed';
        default:
            return 'running';
    }
}

function qualifyTurnUiEventKey(state: { qualifyUiEventKey(key: string): string }, key: string | undefined): string | undefined {
    const resolvedKey = String(key || '').trim();
    return resolvedKey ? state.qualifyUiEventKey(resolvedKey) : undefined;
}

/**
 * Consumes one streamed turn chunk (text/reasoning/tool_call/done/event) and
 * projects it into the message list, activities and timeline event rows.
 */
export function consumeStreamChunkView(host: AgentConsoleTurnStreamHost, chunk: any, assistantMessage: AgentMessage): void {
    host.state.setTokenUsage(chunk);
    if (chunk?.type === 'event') {
        consumeStreamEventChunkView(host, chunk);
        return;
    }
    if (chunk?.type === 'text' && chunk.content) {
        assistantMessage.content += chunk.content;
        host.scheduleStreamingAssistantMessageFlush(assistantMessage);
        return;
    }
    if (chunk?.type === 'reasoning' && chunk.content) {
        host.state.setStatus('reasoning');
        host.updateTerminalTitle();
        host.state.pushActivity('model', `Reasoning: ${host.state.summarize(chunk.content)}`);
        host.state.upsertUiEventMessage(host.state.qualifyUiEventKey('reasoning'), 'Reasoning about implementation', {
            eventType: 'reasoning',
            label: 'think',
            status: 'running'
        });
        return;
    }
    if (chunk?.type === 'tool_call') {
        const content = describePendingToolCall(chunk, host.translator);
        const eventKey = qualifyTurnUiEventKey(host.state, resolveToolEventKey('tool_call', chunk));
        host.state.pushActivity('tool', `Tool call: ${host.state.summarize(String(content || chunk.content || ''))}`);
        if (eventKey) {
            host.state.upsertUiEventMessage(eventKey, content, {
                eventType: 'tool_call',
                label: 'tool',
                status: 'running',
                toolCallId: String(chunk?.toolCallId || '').trim() || undefined,
                receiptId: String(chunk?.receiptId || chunk?.receipt?.receiptId || '').trim() || undefined,
                attempt: Number(chunk?.attemptCount || chunk?.receipt?.attemptCount) || undefined,
                source: 'stream',
                sequence: Number(chunk?.sequence) || undefined
            });
        } else {
            host.state.appendUiEventMessage(content, {
                eventType: 'tool_call',
                label: 'tool',
                status: 'running'
            });
        }
        if (String(chunk.content || '').includes('todo')) {
            void host.refreshTodoPlan();
        }
        return;
    }
    if (chunk?.type === 'done' && chunk.message) {
        assistantMessage.content = chunk.message.content || assistantMessage.content;
        assistantMessage.metadata = {
            ...(chunk.message.metadata || {}),
            streaming: false
        };
        replaceStreamingAssistantMessage(host.state, host.destroyed === true, assistantMessage);
        host.state.setTokenUsage(chunk.message.metadata?.usage);
    }
}

/**
 * Consumes one streamed event chunk (approval/compensation/context/turn
 * diagnostics plus generic tool/state lifecycle rows).
 */
export function consumeStreamEventChunkView(host: AgentConsoleTurnStreamHost, chunk: any): void {
    const eventType = String(chunk?.eventType || 'state').trim() || 'state';
    if (eventType === 'approval_requested') {
        const toolName = String(chunk?.toolName || 'tool');
        const inputSummary = String(chunk?.inputSummary || chunk?.command || chunk?.input || '').trim();
        host.state.upsertPendingApproval({
            id: String(chunk?.approvalId || `approval-${Date.now()}`),
            toolName,
            sessionId: host.state.sessionId,
            reason: String(chunk?.content || `Approval required for ${toolName}`),
            summary: String(chunk?.content || ''),
            hasInput: true,
            inputSummary: inputSummary || undefined,
            createdAt: Date.now(),
            timeoutMs: Number(chunk?.timeoutMs) || 0
        } as AgentConsoleApprovalRequest);
        host.state.requestApprovalAttention();
        host.state.pushActivity('tool', `Approval required for ${toolName}`);
        return;
    }
    if (eventType === 'approval_completed' || eventType === 'approval_failed') {
        void host.refreshPendingApprovals();
        return;
    }
    if (eventType === 'compensation') {
        const compensated = Number(chunk?.compensated || 0);
        if (compensated > 0) {
            host.state.pushActivity(
                'rollback',
                `Rolled back ${compensated} side-effecting tool call${compensated === 1 ? '' : 's'}`
            );
        }
        return;
    }
    if (eventType === 'context_prepared') {
        if (chunk?.report) {
            host.state.setContextPreparation(chunk.report);
            host.state.pushActivity(
                'model',
                `Context ${chunk.report.strategy}: ${chunk.report.beforeTokens}→${chunk.report.afterTokens}`
            );
            return;
        }
        const contextContent = String(chunk?.content || '').trim();
        if (contextContent) {
            host.state.pushActivity('model', contextContent);
        }
        return;
    }
    if (eventType === 'turn_diagnostics') {
        const diagnostics = chunk?.diagnostics || {};
        const compactionCount = Number(diagnostics.compactionCount ?? 0);
        const totalSavings = Number(diagnostics.totalTokenSavings ?? 0);
        const promptCache = diagnostics.promptCache;
        const parts: string[] = [];
        if (compactionCount > 0 || totalSavings > 0) {
            parts.push(`${compactionCount} compaction${compactionCount === 1 ? '' : 's'}, ${totalSavings} tokens saved`);
        }
        if (promptCache) {
            const support = String(promptCache.supported || 'none');
            const applied = promptCache.applied ? 'applied' : 'not applied';
            const cachedTokens = Number(promptCache.observedCachedPromptTokens ?? 0);
            parts.push(`prompt cache ${support} (${applied}${cachedTokens ? `, ${cachedTokens} cached tokens` : ''})`);
        }
        if (parts.length) {
            host.state.pushActivity('model', `Turn diagnostics: ${parts.join('; ')}`);
            return;
        }
        const diagnosticsContent = String(chunk?.content || '').trim();
        if (diagnosticsContent) {
            host.state.pushActivity('model', diagnosticsContent);
        }
        return;
    }
    const content = describeStreamEventContent(eventType, chunk, host.translator);
    if (!content) {
        return;
    }
    const label = String(chunk?.label || resolveStreamEventLabel(eventType)).trim() || 'state';
    const status = normalizeUiEventStatus(chunk?.status);
    const eventKey = qualifyTurnUiEventKey(host.state, resolveToolEventKey(eventType, chunk))
        || (eventType === 'turn_started'
            ? host.state.qualifyUiEventKey('turn-start')
            : eventType === 'reasoning'
                ? host.state.qualifyUiEventKey('reasoning')
                : undefined);
    if (eventKey) {
        host.state.upsertUiEventMessage(eventKey, content, {
            eventType,
            label,
            status,
            toolCallId: String(chunk?.toolCallId || '').trim() || undefined,
            receiptId: String(chunk?.receiptId || chunk?.receipt?.receiptId || '').trim() || undefined,
            attempt: Number(chunk?.attemptCount || chunk?.receipt?.attemptCount) || undefined,
            source: 'stream',
            sequence: Number(chunk?.sequence) || undefined
        });
        return;
    }
    host.state.appendUiEventMessage(content, {
        eventType,
        label,
        status,
        source: 'stream',
        sequence: Number(chunk?.sequence) || undefined
    });
}