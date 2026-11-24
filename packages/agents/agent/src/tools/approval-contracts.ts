import { Abstract, token } from '@tsdi/ioc';
import type { ApprovalRule } from './ApprovalStrategy';
import type { PermissionDecision, PermissionRule } from '../permissions/PermissionEngine';

export interface ApprovalStrategy {
    requires(toolName: string, input: any, sessionId?: string): boolean;
    reason(toolName: string, input: any): string;
    /** Structured form of `reason` for localized rendering. */
    reasonDetail?(toolName: string, input: any): { code: string; params?: Record<string, any> };
    /** Whether a matched approval rule denies without entering the pending surface (granular `mode: 'auto-deny'`). */
    autoDenies?(toolName: string, input: any, sessionId?: string): boolean;
    /** Whether an injected ApprovalReviewer may resolve requests without a human (A2). */
    autoReview?: boolean;
    /** Per-session rule overrides; evaluated after the workspace rules. */
    setSessionRules?(sessionId: string, rules: ApprovalRule[]): void;
    getSessionRules?(sessionId: string): ApprovalRule[];
    /** P1.1: durable "always allow" patterns form the saved permission layer. */
    setSavedAllowPatterns?(patterns: string[]): void;
    /** P1.1: live workspace v3 permission rules. */
    setPermissionRules?(rules: PermissionRule[] | (() => PermissionRule[] | undefined)): void;
    /** P1.1: current v3 rules across layers. */
    listPermissionRules?(sessionId?: string): PermissionRule[];
    /** P1.1: v3 decision for a tool call (undefined when no rule matched). */
    explainPermission?(toolName: string, input: any, sessionId?: string): import('../permissions/PermissionEngine').PermissionDecision | undefined;
}

export const AgentApprovalStrategy = token<ApprovalStrategy>('AgentApprovalStrategy');

/**
 * A2: automatic approval review. An optional reviewer inspects the gated tool
 * (definition + input + session evidence) and may suggest a decision. Only
 * `approve` / `deny` short-circuit the human flow; `needs-human` and any
 * reviewer failure fall back to the normal pending-approval surface.
 */
export type ReviewSuggestion = 'approve' | 'deny' | 'needs-human';

export interface ApprovalReviewContext {
    toolName: string;
    input: any;
    inputSummary?: string;
    sessionId: string;
    reason: string;
}

export interface ApprovalReviewer {
    review(context: ApprovalReviewContext):
        | Promise<ReviewSuggestion | { action: ReviewSuggestion; reason?: string }>
        | ReviewSuggestion
        | { action: ReviewSuggestion; reason?: string };
}

export const AgentApprovalReviewer = token<ApprovalReviewer>('AgentApprovalReviewer');

export interface ApprovalManagerOptions {
    defaultTimeoutMs?: number;
    maxTimeoutMs?: number;
    maxPendingApprovals?: number;
    autoDeny?: boolean;
    /** A2: run the injected ApprovalReviewer before surfacing a human approval. */
    autoReview?: boolean;
    /** G79: automatically approve all requests for this session (e.g. automation / headless mode). */
    autoApprove?: boolean;
    /** P1.1: unattended ruleset (resolve asks immediately when no human is present). */
    unattended?: 'deny' | 'allow';
}
export const AgentApprovalOptions = token<ApprovalManagerOptions>('AgentApprovalOptions');

export enum ApprovalDecision {
    APPROVED = 'approved',
    DENIED = 'denied',
    TIMEOUT = 'timeout',
    NOT_REQUIRED = 'not_required',
    CANCELLED = 'cancelled'
}

export interface ApprovalRequest {
    id: string;
    toolName: string;
    input: any;
    hasInput: boolean;
    inputSummary?: string;
    sessionId: string;
    reason: string;
    reasonDetail?: { code: string; params?: Record<string, any> };
    summary: string;
    createdAt: number;
    timeoutMs: number;
    expiresAt: number;
}

export interface ApprovalRequestView {
    id: string;
    toolName: string;
    sessionId: string;
    reason: string;
    reasonDetail?: { code: string; params?: Record<string, any> };
    summary: string;
    hasInput: boolean;
    inputSummary?: string;
    createdAt: number;
    timeoutMs: number;
    expiresAt: number;
}

export interface ApprovalResult {
    decision: ApprovalDecision;
    request?: ApprovalRequest;
    /** P1.1: optional user explanation supplied with a rejection (corrected error). */
    feedback?: string;
}

/** IoC contract for approval consumers; implementations may be replaced per host. */
@Abstract()
export abstract class ApprovalManager {
    abstract checkApproval(toolName: string, input: any, sessionId: string, force?: boolean): Promise<ApprovalResult>;
    abstract requireApproval(toolName: string, input: any, sessionId: string): Promise<boolean>;
    abstract requiresApproval(toolName: string, input: any): boolean;
    abstract approve(requestId: string): boolean;
    /** P1.1: `feedback` lets the user explain a rejection to the agent. */
    abstract reject(requestId: string, feedback?: string): boolean;
    abstract cancelBySession(sessionId: string): number;
    abstract getPending(): ApprovalRequestView[];
    abstract isConfigured(): boolean;
    abstract isAutoApproveEnabled(): boolean;
    abstract setAutoApprove(enabled: boolean): void;
    /** Optional: project-scoped tool allow list (durable "always allow"). */
    setAllowRules?(_rules: string[]): void;
    getAllowRules?(): string[];
    /** P1.1: v3 permission rules (live source allowed so settings edits apply without rebuild). */
    setPermissionRules?(_rules: PermissionRule[] | (() => PermissionRule[] | undefined)): void;
    listPermissionRules?(_sessionId?: string): PermissionRule[];
    inspectPermission?(_toolName: string, _input: any, _sessionId?: string): import('../permissions/PermissionEngine').PermissionDecision | undefined;
    /** Optional: hosts that expose an approval-timeout setting update it here. */
    setDefaultTimeout(_timeoutMs: number): void { /* no-op for managers without a queue policy */ }
}

