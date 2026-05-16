import { Injectable, Optional, Inject, token } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { randomUUID } from 'crypto';
import { AgentApprovalRequestedEvent, AgentApprovalCompletedEvent, AgentApprovalFailedEvent } from '../runtime/AgentEvents';

export interface ApprovalStrategy {
    requires(toolName: string, input: any): boolean;
    reason(toolName: string, input: any): string;
}

export const AgentApprovalStrategy = token<ApprovalStrategy>('AgentApprovalStrategy');
export interface ApprovalManagerOptions {
    defaultTimeoutMs?: number;
    maxTimeoutMs?: number;
    maxPendingApprovals?: number;
    autoDeny?: boolean;
}
export const AgentApprovalOptions = token<ApprovalManagerOptions>('AgentApprovalOptions');

export enum ApprovalDecision {
    APPROVED = 'approved',
    DENIED = 'denied',
    TIMEOUT = 'timeout',
    NOT_REQUIRED = 'not_required'
}

export interface ApprovalRequest {
    id: string;
    toolName: string;
    input: any;
    hasInput: boolean;
    inputSummary?: string;
    sessionId: string;
    reason: string;
    summary: string;
    createdAt: number;
    timeoutMs: number;
}

export interface ApprovalRequestView {
    id: string;
    toolName: string;
    sessionId: string;
    reason: string;
    summary: string;
    hasInput: boolean;
    inputSummary?: string;
    createdAt: number;
    timeoutMs: number;
}

export interface ApprovalResult {
    decision: ApprovalDecision;
    request?: ApprovalRequest;
}

const DEFAULT_APPROVAL_TIMEOUT_MS = 30000;
const DEFAULT_MAX_APPROVAL_TIMEOUT_MS = 300000;
const DEFAULT_MAX_PENDING_APPROVALS = 100;
const MAX_APPROVAL_INPUT_SUMMARY_CHARS = 200;

function safeSerialize(input: any): string | undefined {
    if (input === undefined) {
        return undefined;
    }
    const seen = new WeakSet<object>();
    try {
        return JSON.stringify(input, (_key, current) => {
            if (typeof current === 'bigint') {
                return current.toString();
            }
            if (current && typeof current === 'object') {
                if (seen.has(current)) {
                    return '[circular]';
                }
                seen.add(current);
            }
            return current;
        });
    } catch {
        return '[unserializable]';
    }
}

function snapshotApprovalInput(input: any): any {
    const serialized = safeSerialize(input);
    if (serialized == null) {
        return input;
    }
    try {
        return JSON.parse(serialized);
    } catch {
        return serialized;
    }
}

function summarizeApprovalInput(input: any): string | undefined {
    const text = typeof input === 'string' ? input : safeSerialize(input);
    if (!text) {
        return undefined;
    }
    return text.length > MAX_APPROVAL_INPUT_SUMMARY_CHARS
        ? `${text.slice(0, MAX_APPROVAL_INPUT_SUMMARY_CHARS)}...[truncated]`
        : text;
}

@Injectable()
export class ToolApprovalManager {
    private pending = new Map<string, {
        request: ApprovalRequest;
        resolve: (decision: ApprovalDecision) => void;
        timer: ReturnType<typeof setTimeout>;
    }>();

    constructor(
        private app: ApplicationContext,
        @Optional() @Inject(AgentApprovalStrategy, { defaultValue: null })
        private strategy?: ApprovalStrategy,
        @Optional() @Inject(AgentApprovalOptions, { defaultValue: null })
        private options?: ApprovalManagerOptions
    ) {
    }

    isConfigured(): boolean {
        return !!this.strategy;
    }

    requiresApproval(toolName: string, input: any): boolean {
        return this.strategy?.requires(toolName, input) ?? false;
    }

    async checkApproval(toolName: string, input: any, sessionId: string): Promise<ApprovalResult> {
        if (!this.requiresApproval(toolName, input)) {
            return { decision: ApprovalDecision.NOT_REQUIRED };
        }
        if (this.pending.size >= (this.options?.maxPendingApprovals ?? DEFAULT_MAX_PENDING_APPROVALS)) {
            return { decision: ApprovalDecision.DENIED };
        }

        const request = this.createRequest(toolName, input, sessionId);
        if (this.options?.autoDeny) {
            this.app.publishEvent(new AgentApprovalRequestedEvent(this, this.toRequestView(request)))
                .catch(() => {});
            this.app.publishEvent(new AgentApprovalCompletedEvent(this, this.toRequestRef(request), false))
                .catch(() => {});
            return { decision: ApprovalDecision.DENIED, request };
        }

        const decision = await new Promise<ApprovalDecision>((resolve) => {
            const timer = setTimeout(() => {
                this.pending.delete(request.id);
                this.app.publishEvent(new AgentApprovalFailedEvent(this, this.toRequestRef(request), new Error('Approval timeout')))
                    .catch(() => {});
                resolve(ApprovalDecision.TIMEOUT);
            }, request.timeoutMs);

            this.pending.set(request.id, { request, resolve, timer });
            this.app.publishEvent(new AgentApprovalRequestedEvent(this, this.toRequestView(request)))
                .catch(() => {});
        });

        this.app.publishEvent(new AgentApprovalCompletedEvent(this, this.toRequestRef(request), decision === ApprovalDecision.APPROVED))
            .catch(() => {});
        return { decision, request };
    }

    async requireApproval(toolName: string, input: any, sessionId: string): Promise<boolean> {
        const result = await this.checkApproval(toolName, input, sessionId);
        return result.decision === ApprovalDecision.APPROVED || result.decision === ApprovalDecision.NOT_REQUIRED;
    }

    approve(requestId: string): boolean {
        const pending = this.pending.get(requestId);
        if (!pending) return false;
        clearTimeout(pending.timer);
        this.pending.delete(requestId);
        pending.resolve(ApprovalDecision.APPROVED);
        return true;
    }

    reject(requestId: string): boolean {
        const pending = this.pending.get(requestId);
        if (!pending) return false;
        clearTimeout(pending.timer);
        this.pending.delete(requestId);
        pending.resolve(ApprovalDecision.DENIED);
        return true;
    }

    getPending(): ApprovalRequestView[] {
        return Array.from(this.pending.values()).map(({ request }) => this.toRequestView(request));
    }

    private createRequest(toolName: string, input: any, sessionId: string): ApprovalRequest {
        const requestInput = snapshotApprovalInput(input);
        const inputSummary = summarizeApprovalInput(requestInput);
        const reason = this.strategy?.reason(toolName, requestInput) ?? `Tool "${toolName}" requires approval.`;
        const timeoutMs = Math.min(
            this.options?.defaultTimeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS,
            this.options?.maxTimeoutMs ?? DEFAULT_MAX_APPROVAL_TIMEOUT_MS
        );
        return {
            id: randomUUID(),
            toolName,
            input: requestInput,
            hasInput: input !== undefined,
            inputSummary,
            sessionId,
            reason,
            summary: inputSummary ? `${reason} Summary: ${inputSummary}` : reason,
            createdAt: Date.now(),
            timeoutMs
        };
    }

    private toRequestView(request: ApprovalRequest): ApprovalRequestView {
        return {
            id: request.id,
            toolName: request.toolName,
            sessionId: request.sessionId,
            reason: request.reason,
            summary: request.summary,
            hasInput: request.hasInput,
            inputSummary: request.inputSummary,
            createdAt: request.createdAt,
            timeoutMs: request.timeoutMs
        };
    }

    private toRequestRef(request: ApprovalRequest): { id: string; toolName: string; sessionId: string } {
        return {
            id: request.id,
            toolName: request.toolName,
            sessionId: request.sessionId
        };
    }
}

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

    reason(toolName: string, _input: any): string {
        return `Tool "${toolName}" requires approval.`;
    }
}

