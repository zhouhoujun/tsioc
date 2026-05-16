import { Injectable, Optional, Inject, token } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { randomUUID } from 'crypto';
import { AgentApprovalRequestedEvent, AgentApprovalCompletedEvent, AgentApprovalFailedEvent } from '../runtime/AgentEvents';

export interface ApprovalStrategy {
    /** Return true if this tool+input combination requires approval */
    requires(toolName: string, input: any): boolean;
    /** Human-readable reason for the approval request */
    reason(toolName: string, input: any): string;
}

export const AgentApprovalStrategy = token<ApprovalStrategy>('AgentApprovalStrategy');
export const AgentApprovalOptions = token<{ defaultTimeoutMs?: number }>('AgentApprovalOptions');

export interface ApprovalRequest {
    id: string;
    toolName: string;
    input: any;
    sessionId: string;
    reason: string;
    createdAt: number;
    timeoutMs: number;
}

export interface ApprovalStrategy {
    /** Return true if this tool+input combination requires approval */
    requires(toolName: string, input: any): boolean;
    /** Human-readable reason for the approval request */
    reason(toolName: string, input: any): string;
}

/**
 * Manages tool call approval flow — automatically blocks dangerous tools
 * until a human (or automated policy) approves them.
 *
 * Reference: zeroclaw ApprovalManager + AutonomyLevel
 */
@Injectable()
export class ToolApprovalManager {
    private pending = new Map<string, {
        request: ApprovalRequest;
        resolve: (approved: boolean) => void;
        timer: ReturnType<typeof setTimeout>;
    }>();

    constructor(
        private app: ApplicationContext,
        @Optional() @Inject(AgentApprovalStrategy, { defaultValue: null })
        private strategy?: ApprovalStrategy,
        @Optional() @Inject(AgentApprovalOptions, { defaultValue: null })
        private options?: { defaultTimeoutMs?: number }
    ) {
    }

    /**
     * Check if a tool call needs approval and wait for it.
     * Returns true immediately if no approval needed.
     */
    async requireApproval(toolName: string, input: any, sessionId: string): Promise<boolean> {
        if (!this.strategy?.requires(toolName, input)) {
            return true;
        }

        const reason = this.strategy.reason(toolName, input);
        const request: ApprovalRequest = {
            id: randomUUID(),
            toolName,
            input,
            sessionId,
            reason,
            createdAt: Date.now(),
            timeoutMs: this.options?.defaultTimeoutMs ?? 30000
        };

        const result = await new Promise<boolean>((resolve) => {
            const timer = setTimeout(() => {
                this.pending.delete(request.id);
                this.app.publishEvent(new AgentApprovalFailedEvent(this, request, new Error('Approval timeout')))
                    .catch(() => {});
                resolve(false);
            }, request.timeoutMs);

            this.pending.set(request.id, { request, resolve, timer });
            this.app.publishEvent(new AgentApprovalRequestedEvent(this, request))
                .catch(() => {});
        });

        this.app.publishEvent(new AgentApprovalCompletedEvent(this, request, result))
            .catch(() => {});
        return result;
    }

    /** Approve a pending request */
    approve(requestId: string): boolean {
        const pending = this.pending.get(requestId);
        if (!pending) return false;
        clearTimeout(pending.timer);
        this.pending.delete(requestId);
        pending.resolve(true);
        return true;
    }

    /** Reject a pending request */
    reject(requestId: string): boolean {
        const pending = this.pending.get(requestId);
        if (!pending) return false;
        clearTimeout(pending.timer);
        this.pending.delete(requestId);
        pending.resolve(false);
        return true;
    }

    /** List all pending approval requests */
    getPending(): ApprovalRequest[] {
        return Array.from(this.pending.values()).map(({ request }) => ({ ...request }));
    }
}

/** Default approval strategy — requires approval for high-risk tools */
export class DefaultApprovalStrategy implements ApprovalStrategy {
    private blockedTools: Set<string>;

    constructor(blocked?: string[]) {
        this.blockedTools = new Set(blocked ?? [
            'shell.exec',
            'fs.write',
            'fs.delete',
            'db.execute',
            'deploy',
            'sudo.exec',
            'admin.*'
        ]);
    }

    requires(toolName: string, _input: any): boolean {
        for (const pattern of this.blockedTools) {
            if (pattern.endsWith('*')) {
                const prefix = pattern.slice(0, -1);
                if (toolName.startsWith(prefix)) return true;
            }
            if (toolName === pattern) return true;
        }
        return false;
    }

    reason(toolName: string, input: any): string {
        return `Tool "${toolName}" requires approval. Input: ${JSON.stringify(input)}`;
    }
}

