import { formatAgentUiNotice } from './agent-ui.i18n';
import { collectExportToolCalls, createExportResult, normalizeExportFormat, normalizeExportResult } from './AgentConsoleSessionExport';
import type { AgentSessionExportOptions, AgentSessionExportResult } from './AgentConsoleSessionService';
import { AgentConsoleSessionSectionRpc } from './AgentConsoleSessionSectionRpc';

/** Session export and approval decision RPC. */
export abstract class AgentConsoleSessionExportRpc extends AgentConsoleSessionSectionRpc {
    async exportSession(
        sessionId: string,
        options?: AgentSessionExportOptions,
        context?: any
    ): Promise<AgentSessionExportResult> {
        const resolvedSessionId = String(sessionId || '').trim();
        if (!resolvedSessionId) { throw new Error(formatAgentUiNotice(undefined, 'sessionIdRequired')); }
        const format = normalizeExportFormat(options?.format);
        if (this.appRpc) {
            const result = await this.appRpc.request('session.export', { sessionId: resolvedSessionId, format }, context);
            if (format === 'html') {
                // Gateways only emit json/jsonl; render the HTML artifact
                // locally from the returned messages so every host agrees.
                const messages = Array.isArray(result?.messages) ? result.messages : [];
                return createExportResult(
                    resolvedSessionId,
                    'html',
                    Number(result?.exportedAt) || Date.now(),
                    result?.session && typeof result.session === 'object'
                        ? result.session
                        : { id: resolvedSessionId, messageCount: messages.length },
                    messages,
                    collectExportToolCalls(messages)
                );
            }
            return normalizeExportResult(resolvedSessionId, format, result);
        }
        const state = this.sessionStore
            ? await this.sessionStore.get(resolvedSessionId)
            : undefined;
        const messages = state?.messages
            ? state.messages.slice()
            : this.runtime
                ? await this.runtime.getMessages(resolvedSessionId)
                : [];
        const toolCalls = collectExportToolCalls(messages);
        const exportedAt = Date.now();
        const session = {
            id: resolvedSessionId,
            createdAt: state?.createdAt ?? null,
            updatedAt: state?.updatedAt ?? null,
            summary: state?.summary ?? null,
            workspace: state?.workspace ?? null,
            projectId: state?.projectId ?? null,
            primaryThreadId: state?.primaryThreadId ?? null,
            originThreadId: state?.originThreadId ?? null,
            sessionRole: state?.sessionRole ?? null,
            rootRequest: state?.rootRequest ?? null,
            focusSummary: state?.focusSummary ?? null,
            threadStatus: state?.threadStatus ?? null,
            messageCount: messages.length,
            toolCallCount: toolCalls.length
        };
        return createExportResult(resolvedSessionId, format, exportedAt, session, messages, toolCalls);
    }

    async listApprovals(sessionId?: string, context?: any): Promise<Array<Record<string, any>>> {
        if (this.appRpc) {
            const result = await this.appRpc.request('approval.list', sessionId ? { sessionId } : {}, context);
            return Array.isArray(result?.requests) ? result.requests : [];
        }
        return [];
    }

    async decideApproval(decision: 'approve' | 'deny', requestId: string, context?: any, feedback?: string): Promise<Record<string, any> | null> {
        if (!this.appRpc || !requestId) {
            return null;
        }
        const result = await this.appRpc.request(
            decision === 'approve' ? 'approval.approve' : 'approval.reject',
            { requestId, ...(feedback ? { feedback } : {}) },
            context
        );
        return result ?? null;
    }
}
