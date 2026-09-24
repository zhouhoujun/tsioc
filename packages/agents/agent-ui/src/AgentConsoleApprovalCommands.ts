import { AgentConsoleApprovalRequest } from './AgentConsoleSessionState';

export interface ApprovalInspectorHost {
    state: any;
    translator?: { translate(key: string): string };
    notify(message: string): void;
    select(title: string, options: any[], index: number, hint?: string): Promise<string | undefined>;
    selectApprovalRequest(requests: AgentConsoleApprovalRequest[], index: number): Promise<AgentConsoleApprovalRequest | undefined>;
    applyApprovalDecision(decision: 'approve' | 'deny', requestId: string): Promise<boolean>;
    refreshPendingApprovals(): Promise<void>;
    copyFocusedTextActionHandler: (text: string, label: string) => Promise<void>;
}

export async function openApprovalInspector(host: ApprovalInspectorHost, requests: AgentConsoleApprovalRequest[]): Promise<void> {
    if (!requests.length) {
        host.notify(host.translator?.translate('agent.notice.noPendingApprovals') || 'No pending approvals.');
        return;
    }
    let selectedRequestIndex = 0;
    while (true) {
        const request = await host.selectApprovalRequest(requests, selectedRequestIndex);
        if (!request) {
            return;
        }
        selectedRequestIndex = Math.max(0, requests.findIndex(item => item.id === request.id));
        const detail = [
            `Tool: ${request.toolName}`,
            `Reason: ${request.reason}`,
            request.inputSummary ? `Input: ${request.inputSummary}` : 'Input: -',
            `Timeout: ${request.timeoutMs}ms`,
            request.expiresAt ? `Expires: ${new Date(request.expiresAt).toLocaleTimeString()}` : ''
        ].join('\n');
        const action = await host.select(`Approval ${request.id.slice(0, 8)}`, [
            {
                label: 'Approve',
                value: 'approve',
                description: 'Allow this request',
                detail
            },
            {
                label: 'Deny',
                value: 'deny',
                description: 'Reject this request',
                detail
            },
            {
                label: 'Copy input',
                value: 'copy-input',
                description: 'Copy request input summary',
                detail
            }
        ], 0, host.state.consoleOptions.selectHint);
        if (!action) {
            if (requests.length === 1) {
                return;
            }
            continue;
        }
        if (action === 'approve') {
            const approved = await host.applyApprovalDecision('approve', request.id);
            host.notify(approved
                ? `Approved ${request.toolName} (${request.id.slice(0, 8)}).`
                : `Approval request ${request.id.slice(0, 8)} is no longer pending.`);
            await host.refreshPendingApprovals();
            return;
        }
        if (action === 'deny') {
            const denied = await host.applyApprovalDecision('deny', request.id);
            host.notify(denied
                ? `Denied ${request.toolName} (${request.id.slice(0, 8)}).`
                : `Approval request ${request.id.slice(0, 8)} is no longer pending.`);
            await host.refreshPendingApprovals();
            return;
        }
        if (action === 'copy-input') {
            await host.copyFocusedTextActionHandler(request.inputSummary || request.summary, 'approval input');
            return;
        }
    }
}
