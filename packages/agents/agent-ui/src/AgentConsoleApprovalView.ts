import { formatAgentConsoleApprovalInput } from './AgentConsoleApprovalInput';
import { formatAgentUiTime, type AgentUiTranslator } from './agent-ui.i18n';

/** Resolves a localized string, falling back to the English template. */
export type ApprovalTranslate = (key: string, params: Record<string, any> | undefined, fallback: string) => string;

const passthroughTranslate: ApprovalTranslate = (_key, _params, fallback) => fallback;

export async function selectApprovalRequest(
    select: (title: string, options: any[], index: number, hint?: string) => Promise<string | undefined>,
    state: any,
    requests: any[],
    selectedIndex = 0,
    translate: ApprovalTranslate = passthroughTranslate,
    translator?: AgentUiTranslator | null
): Promise<any> {
    if (!requests.length) {
        return undefined;
    }
    if (requests.length === 1) {
        return requests[0];
    }
    const selected = await select(translate('agent.approval.pendingTitle', undefined, 'Pending approvals'), requests.map(request => {
        const input = formatAgentConsoleApprovalInput(request.toolName, request.inputSummary);
        return {
            label: `${request.toolName} (${request.id.slice(0, 8)})`,
            value: request.id,
            description: request.reason,
            detail: [
                translate('agent.approval.tool', { tool: request.toolName }, `Tool: ${request.toolName}`),
                translate('agent.approval.reason', { reason: request.reason }, `Reason: ${request.reason}`),
                input
                    ? translate('agent.approval.input', { input }, `Input: ${input}`)
                    : translate('agent.approval.inputNone', undefined, 'Input: -'),
                translate('agent.approval.timeout', { ms: request.timeoutMs }, `Timeout: ${request.timeoutMs}ms`),
                request.expiresAt
                    ? translate('agent.approval.expiresAt', { time: formatAgentUiTime(request.expiresAt, translator) }, `Expires: ${formatAgentUiTime(request.expiresAt, translator)}`)
                    : ''
            ].join('\n')
        };
    }), Math.max(0, Math.min(requests.length - 1, selectedIndex)), state.consoleOptions.selectHint);
    return requests.find(request => request.id === selected);
}

export async function refreshPendingApprovals(
    sessionId: string,
    state: any,
    approvalManager: any,
    appRpc: any,
    sessionService: any,
    updateTitle: () => void
): Promise<void> {
    if (approvalManager) {
        const pending = approvalManager.getPending().filter((request: any) => request.sessionId === sessionId);
        if (sessionId === state.sessionId) {
            state.setPendingApprovals(pending);
            updateTitle();
        }
        return;
    }
    if (appRpc && sessionService) {
        const requests = await sessionService.listApprovals(sessionId);
        if (sessionId === state.sessionId) {
            state.setPendingApprovals(requests);
            updateTitle();
        }
        return;
    }
    if (sessionId === state.sessionId) {
        state.setPendingApprovals([]);
        updateTitle();
    }
}
