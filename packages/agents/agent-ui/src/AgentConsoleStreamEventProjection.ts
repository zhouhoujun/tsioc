import type { AgentConsoleApprovalRequest } from './AgentConsoleSessionState';
import {
    describeStreamEventContent,
    resolveStreamEventLabel,
    resolveToolEventKey
} from './AgentConsoleStreamHelpers';
import type { AgentConsoleTurnStreamHost } from './AgentConsoleTurnStreamController';

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

export function qualifyTurnUiEventKey(state: { qualifyUiEventKey(key: string): string }, key: string | undefined): string | undefined {
    const resolvedKey = String(key || '').trim();
    return resolvedKey ? state.qualifyUiEventKey(resolvedKey) : undefined;
}

/**
 * Consumes one streamed turn chunk (text/reasoning/tool_call/done/event) and
 * projects it into the message list, activities and timeline event rows.
 */

export function consumeStreamEventChunkView(host: AgentConsoleTurnStreamHost, chunk: any): void {
    const eventType = String(chunk?.eventType || 'state').trim() || 'state';
    if (eventType === 'approval_requested') {
        const toolName = String(chunk?.toolName || 'tool');
        const inputSummary = String(chunk?.inputSummary || chunk?.command || chunk?.input || '').trim();
        const timeoutMs = Number(chunk?.timeoutMs) || 0;
        const expiresAt = Number(chunk?.expiresAt) || 0;
        const fallbackContent = String(chunk?.content || '');
        host.state.upsertPendingApproval({
            id: String(chunk?.approvalId || `approval-${Date.now()}`),
            toolName,
            sessionId: host.state.sessionId,
            // Prefer the structured fields: `content` already contains a
            // composed sentence, so using it for both `reason` and `$ input`
            // printed the same text twice in the approval panel.
            reason: String(chunk?.reason || fallbackContent || `Approval required for ${toolName}`),
            reasonDetail: chunk?.reasonDetail && typeof chunk.reasonDetail === 'object' ? chunk.reasonDetail : undefined,
            summary: String(chunk?.summary || fallbackContent || ''),
            hasInput: chunk?.hasInput !== false,
            inputSummary: inputSummary || undefined,
            createdAt: Number(chunk?.createdAt) || Date.now(),
            timeoutMs,
            expiresAt: expiresAt > 0 ? expiresAt : (timeoutMs > 0 ? Date.now() + timeoutMs : 0)
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
    const streamedDurationMs = chunk?.durationMs ?? chunk?.receipt?.durationMs;
    const durationOption = streamedDurationMs != null ? { durationMs: Number(streamedDurationMs) } : {};
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
            ...durationOption,
            toolCallId: String(chunk?.toolCallId || chunk?.receipt?.toolCallId || '').trim() || undefined,
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
        ...durationOption,
        source: 'stream',
        sequence: Number(chunk?.sequence) || undefined
    });
}

/**
 * Schedule a flush of the in-flight assistant message with the latest streamed
 * text. The pending-notice lifecycle is driven by incoming stream/turn events,
 * so no timer-backed notice is scheduled here.
 */
