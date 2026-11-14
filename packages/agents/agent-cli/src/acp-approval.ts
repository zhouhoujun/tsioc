import { ApprovalDecision, ApprovalManager } from '@tsdi/agent';
import type { AcpServer } from '@tsdi/agent';

/**
 * Map runtime tool approvals to ACP `session/request_permission` calls.
 * `attach` is called after the server exists (the server needs the runtime,
 * the runtime needs this manager), so both sides share one manager instance.
 */
export class AcpApprovalManager extends ApprovalManager {
    private server?: AcpServer;
    private autoApprove = false;

    attach(server: AcpServer): void {
        this.server = server;
    }

    async checkApproval(toolName: string, input: any, sessionId: string, _force = false): Promise<any> {
        if (!this.server) {
            return { decision: ApprovalDecision.DENIED };
        }
        try {
            const result = await this.server.requestPermission({
                sessionId,
                toolCall: { name: toolName, input },
                options: [
                    { id: 'allow', label: 'Allow once' },
                    { id: 'reject', label: 'Reject' }
                ]
            });
            const outcome = String(result?.outcome ?? result?.optionId ?? '').toLowerCase();
            const decision = outcome.includes('allow') ? ApprovalDecision.APPROVED : ApprovalDecision.DENIED;
            return { decision };
        } catch {
            return { decision: ApprovalDecision.DENIED };
        }
    }

    async requireApproval(toolName: string, input: any, sessionId: string): Promise<boolean> {
        return (await this.checkApproval(toolName, input, sessionId, true)).decision === ApprovalDecision.APPROVED;
    }

    requiresApproval(): boolean {
        return true;
    }

    approve(): boolean {
        return false;
    }

    reject(): boolean {
        return false;
    }

    cancelBySession(): number {
        return 0;
    }

    getPending(): any[] {
        return [];
    }

    isConfigured(): boolean {
        return !!this.server;
    }

    isAutoApproveEnabled(): boolean {
        return this.autoApprove;
    }

    setAutoApprove(enabled: boolean): void {
        this.autoApprove = enabled;
    }
}
