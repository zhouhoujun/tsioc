export async function selectApprovalRequest(
    select: (title: string, options: any[], index: number, hint?: string) => Promise<string | undefined>,
    state: any,
    requests: any[],
    selectedIndex = 0
): Promise<any> {
    if (!requests.length) {
        return undefined;
    }
    if (requests.length === 1) {
        return requests[0];
    }
    const selected = await select('Pending approvals', requests.map(request => ({
        label: `${request.toolName} (${request.id.slice(0, 8)})`,
        value: request.id,
        description: request.reason,
        detail: [
            `Tool: ${request.toolName}`,
            `Reason: ${request.reason}`,
            request.inputSummary ? `Input: ${request.inputSummary}` : 'Input: -',
            `Timeout: ${request.timeoutMs}ms`,
            request.expiresAt ? `Expires: ${new Date(request.expiresAt).toLocaleTimeString()}` : ''
        ].join('\n')
    })), Math.max(0, Math.min(requests.length - 1, selectedIndex)), state.consoleOptions.selectHint);
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
