import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';

export interface ApprovalRequest {
    toolName: string;
    input: Record<string, any>;
    reason: string;
    requestedAt: number;
}

export interface ApprovalResult {
    approved: boolean;
    approvedBy?: string;
    approvedAt?: number;
    rejectionReason?: string;
}

export interface ApprovalAdapter {
    requestApproval(request: ApprovalRequest): Promise<ApprovalResult>;
    pendingRequests(sessionId?: string): ApprovalRequest[];
    cancelRequest(toolName: string, sessionId: string): boolean;
}

export const AGENT_APPROVAL_ADAPTER = 'AGENT_APPROVAL_ADAPTER';

@Injectable()
export class ApprovalTool implements AgentTool {
    name = 'approval';
    description = 'Request, list, or cancel approval for sensitive tool operations. Acts as a guardrail for potentially destructive actions like file deletion, process execution, or external writes.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['request', 'pending', 'cancel'],
                description: 'Approval action.'
            },
            tool: {
                type: 'string',
                description: 'Tool name requiring approval (required for request and cancel).'
            },
            input: {
                type: 'object',
                description: 'The tool input that requires approval (required for request).'
            },
            reason: {
                type: 'string',
                description: 'Reason for the approval request (required for request).'
            }
        },
        required: ['action']
    };
    toolset = 'approval';
    source = 'local';
    execution = { readOnly: false, sideEffect: true, requiresSequential: true };

    constructor(
        @Optional() @Inject(AGENT_APPROVAL_ADAPTER, { defaultValue: null })
        private adapter?: ApprovalAdapter | null
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        if (!this.adapter) {
            throw new Error('approval requires a configured ApprovalAdapter. Provide one via the AGENT_APPROVAL_ADAPTER token.');
        }
        const action = typeof input?.action === 'string' ? input.action : '';

        switch (action) {
            case 'pending': {
                const pending = this.adapter.pendingRequests(context.sessionId);
                return { pending, total: pending.length };
            }
            case 'cancel': {
                const tool = this.requireString(input?.tool, 'approval cancel tool');
                const cancelled = this.adapter.cancelRequest(tool, context.sessionId);
                return { cancelled, tool };
            }
            case 'request': {
                const tool = this.requireString(input?.tool, 'approval request tool');
                const reason = this.requireString(input?.reason, 'approval request reason');
                const result = await this.adapter.requestApproval({
                    toolName: tool,
                    input: typeof input?.input === 'object' && input.input !== null ? input.input : {},
                    reason,
                    requestedAt: Date.now()
                });
                return {
                    tool,
                    approved: result.approved,
                    rejectionReason: result.rejectionReason
                };
            }
            default:
                throw new Error('Invalid action. Must be: request, pending, cancel.');
        }
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
