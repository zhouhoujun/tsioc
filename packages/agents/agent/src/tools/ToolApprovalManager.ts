import { Abstract, Injectable, Optional, Inject, token } from '@tsdi/ioc';
import { ApplicationContext, UuidGenerator } from '@tsdi/core';
import { AgentApprovalRequestedEvent, AgentApprovalCompletedEvent, AgentApprovalFailedEvent } from '../runtime/AgentEvents';
import { AuditSink, AgentAuditRecord } from '../harness/AuditSink';

export interface ApprovalStrategy {
    requires(toolName: string, input: any): boolean;
    reason(toolName: string, input: any): string;
    /** Whether a matched approval rule denies without entering the pending surface (granular `mode: 'auto-deny'`). */
    autoDenies?(toolName: string, input: any): boolean;
    /** Whether an injected ApprovalReviewer may resolve requests without a human (A2). */
    autoReview?: boolean;
}

export const AgentApprovalStrategy = token<ApprovalStrategy>('AgentApprovalStrategy');

/**
 * A3: granular approval categories (mirroring Codex granular permissions).
 * Rules can be expressed as a string tool pattern (backward compatible) or as
 * a category-scoped object with an optional name allowlist and decision mode.
 */
export type ApprovalCategory = 'sandbox' | 'network' | 'mcp' | 'skill';

export interface ApprovalRuleObject {
    category: ApprovalCategory;
    /** Tool names / patterns within the category; when omitted the whole category matches. */
    names?: string[];
    /** 'ask' (default) surfaces a human approval; 'auto-deny' rejects without prompting. */
    mode?: 'ask' | 'auto-deny';
}

export type ApprovalRule = string | ApprovalRuleObject;

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
}

/** IoC contract for approval consumers; implementations may be replaced per host. */
@Abstract()
export abstract class ApprovalManager {
    abstract checkApproval(toolName: string, input: any, sessionId: string, force?: boolean): Promise<ApprovalResult>;
    abstract requireApproval(toolName: string, input: any, sessionId: string): Promise<boolean>;
    abstract requiresApproval(toolName: string, input: any): boolean;
    abstract approve(requestId: string): boolean;
    abstract reject(requestId: string): boolean;
    abstract cancelBySession(sessionId: string): number;
    abstract getPending(): ApprovalRequestView[];
    abstract isConfigured(): boolean;
    abstract isAutoApproveEnabled(): boolean;
    abstract setAutoApprove(enabled: boolean): void;
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
export class ToolApprovalManager extends ApprovalManager {
    private pending = new Map<string, {
        request: ApprovalRequest;
        resolve: (decision: ApprovalDecision) => void;
        timer: ReturnType<typeof setTimeout>;
    }>();

    constructor(
        private app: ApplicationContext,
        private uuid: UuidGenerator,
        @Optional() @Inject(AgentApprovalStrategy, { defaultValue: null })
        private strategy?: ApprovalStrategy,
        @Optional() @Inject(AgentApprovalOptions, { defaultValue: null })
        private options?: ApprovalManagerOptions,
        @Optional()
        private auditSink?: AuditSink,
        @Optional() @Inject(AgentApprovalReviewer, { defaultValue: null })
        private reviewer?: ApprovalReviewer
    ) {
        super();
    }

    isConfigured(): boolean {
        return !!this.strategy;
    }

    setAutoApprove(enabled: boolean): void {
        if (this.options) this.options.autoApprove = enabled;
    }

    isAutoApproveEnabled(): boolean {
        return this.options?.autoApprove === true;
    }

    requiresApproval(toolName: string, input: any): boolean {
        return this.strategy?.requires(toolName, input) ?? false;
    }

    async checkApproval(toolName: string, input: any, sessionId: string, force = false): Promise<ApprovalResult> {
        if (!force && !this.requiresApproval(toolName, input)) {
            return { decision: ApprovalDecision.NOT_REQUIRED };
        }
        // Defensive sweep: requests whose timer already fired but were not yet
        // removed (e.g. event loop blocked) must not count against the cap.
        this.sweepExpired();
        if (this.pending.size >= (this.options?.maxPendingApprovals ?? DEFAULT_MAX_PENDING_APPROVALS)) {
            return { decision: ApprovalDecision.DENIED };
        }

        const request = this.createRequest(toolName, input, sessionId);
        const autoDeny = this.options?.autoDeny === true
            || this.strategy?.autoDenies?.(toolName, input) === true;
        if (autoDeny) {
            this.app.publishEvent(new AgentApprovalRequestedEvent(this, this.toRequestView(request)))
                .catch(() => {});
            this.app.publishEvent(new AgentApprovalCompletedEvent(this, this.toRequestRef(request), false))
                .catch(() => {});
            this.recordApprovalAudit(request, ApprovalDecision.DENIED);
            return { decision: ApprovalDecision.DENIED, request };
        }

        if (this.options?.autoApprove === true) {
            this.app.publishEvent(new AgentApprovalRequestedEvent(this, this.toRequestView(request)))
                .catch(() => {});
            this.app.publishEvent(new AgentApprovalCompletedEvent(this, this.toRequestRef(request), true))
                .catch(() => {});
            this.recordApprovalAudit(request, ApprovalDecision.APPROVED, 'auto-approved by session flag');
            return { decision: ApprovalDecision.APPROVED, request };
        }

        // A2: an injected reviewer may resolve the request without a human.
        // 'needs-human' and review failures fall through to the pending flow.
        const reviewEnabled = this.options?.autoReview === true || this.strategy?.autoReview === true;
        if (reviewEnabled && this.reviewer) {
            const reviewed = await this.runAutoReview(request);
            if (reviewed) {
                return reviewed;
            }
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
        this.recordApprovalAudit(request, decision);
        return { decision, request };
    }

    async requireApproval(toolName: string, input: any, sessionId: string): Promise<boolean> {
        const result = await this.checkApproval(toolName, input, sessionId);
        return result.decision === ApprovalDecision.APPROVED || result.decision === ApprovalDecision.NOT_REQUIRED;
    }

    /**
     * A2: run the injected reviewer for an already-created request. Returns a
     * resolved decision for `approve` / `deny`, or `null` when the reviewer
     * suggests `needs-human` or throws (fall back to the human approval flow).
     */
    private async runAutoReview(request: ApprovalRequest): Promise<ApprovalResult | null> {
        let suggestion: ReviewSuggestion;
        let reviewReason: string | undefined;
        try {
            const result = await this.reviewer!.review({
                toolName: request.toolName,
                input: request.input,
                inputSummary: request.inputSummary,
                sessionId: request.sessionId,
                reason: request.reason
            });
            suggestion = typeof result === 'string' ? result : result.action;
            reviewReason = typeof result === 'string' ? undefined : result.reason;
        } catch {
            return null;
        }
        if (suggestion !== 'approve' && suggestion !== 'deny') {
            return null;
        }
        const decision = suggestion === 'approve' ? ApprovalDecision.APPROVED : ApprovalDecision.DENIED;
        reviewReason = reviewReason ?? (suggestion === 'approve' ? 'auto-approved by review' : 'auto-denied by review');
        this.app.publishEvent(new AgentApprovalRequestedEvent(this, this.toRequestView(request)))
            .catch(() => {});
        this.app.publishEvent(new AgentApprovalCompletedEvent(this, this.toRequestRef(request), decision === ApprovalDecision.APPROVED))
            .catch(() => {});
        this.recordApprovalAudit(request, decision, reviewReason);
        return { decision, request };
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

    /**
     * Cancel all pending approval requests for a session (e.g. when the owning
     * turn is cancelled). Each pending request is resolved as CANCELLED and an
     * AgentApprovalFailedEvent is emitted so listeners can drop the stale entry.
     * Returns the number of requests cancelled.
     */
    cancelBySession(sessionId: string): number {
        let cancelled = 0;
        for (const [requestId, pending] of Array.from(this.pending.entries())) {
            if (pending.request.sessionId !== sessionId) {
                continue;
            }
            clearTimeout(pending.timer);
            this.pending.delete(requestId);
            pending.resolve(ApprovalDecision.CANCELLED);
            this.app.publishEvent(new AgentApprovalFailedEvent(this, this.toRequestRef(pending.request), new Error('Approval cancelled by turn cancellation')))
                .catch(() => {});
            cancelled++;
        }
        return cancelled;
    }

    getPending(): ApprovalRequestView[] {
        // Defensive sweep so clients never observe requests that expired while
        // the event loop was busy; then present oldest requests first (FIFO).
        this.sweepExpired();
        return Array.from(this.pending.values())
            .map(({ request }) => this.toRequestView(request))
            .sort((a, b) => a.createdAt - b.createdAt);
    }

    /**
     * Resolve and remove any pending request whose expiresAt has already
     * passed. The per-request timer normally does this, but when the event
     * loop is blocked (or a timer is delayed) a request can outlive its
     * deadline; this is the defensive backstop. The awaiting checkApproval
     * completion path publishes the audit/event for the resolved decision.
     * Returns how many were swept.
     */
    private sweepExpired(): number {
        const now = Date.now();
        let swept = 0;
        for (const [requestId, pending] of Array.from(this.pending.entries())) {
            if (pending.request.expiresAt > now) {
                continue;
            }
            clearTimeout(pending.timer);
            this.pending.delete(requestId);
            pending.resolve(ApprovalDecision.TIMEOUT);
            this.app.publishEvent(new AgentApprovalFailedEvent(this, this.toRequestRef(pending.request), new Error('Approval timeout')))
                .catch(() => {});
            swept++;
        }
        return swept;
    }

    private createRequest(toolName: string, input: any, sessionId: string): ApprovalRequest {
        const requestInput = snapshotApprovalInput(input);
        const inputSummary = summarizeApprovalInput(requestInput);
        const reason = this.strategy?.reason(toolName, requestInput) ?? `Tool "${toolName}" requires approval.`;
        const timeoutMs = Math.min(
            this.options?.defaultTimeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS,
            this.options?.maxTimeoutMs ?? DEFAULT_MAX_APPROVAL_TIMEOUT_MS
        );
        const createdAt = Date.now();
        return {
            id: this.uuid.generate(),
            toolName,
            input: requestInput,
            hasInput: input !== undefined,
            inputSummary,
            sessionId,
            reason,
            summary: inputSummary ? `${reason} Summary: ${inputSummary}` : reason,
            createdAt,
            timeoutMs,
            expiresAt: createdAt + timeoutMs
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
            timeoutMs: request.timeoutMs,
            expiresAt: request.expiresAt
        };
    }

    private toRequestRef(request: ApprovalRequest): { id: string; toolName: string; sessionId: string } {
        return {
            id: request.id,
            toolName: request.toolName,
            sessionId: request.sessionId
        };
    }

    /**
     * Write the resolved approval decision into the audit sink so approval
     * activity is visible through the same audit surface as tool executions.
     * The record keeps the gated tool name and marks metadata.kind =
     * 'approval' so aggregated stats can separate decisions from executions.
     */
    private recordApprovalAudit(request: ApprovalRequest, decision: ApprovalDecision, reviewReason?: string): void {
        if (!this.auditSink) {
            return;
        }
        const record: AgentAuditRecord = {
            id: this.uuid.generate(),
            sessionId: request.sessionId,
            toolName: request.toolName,
            toolCallId: `approval:${request.id}`,
            status: decision === ApprovalDecision.APPROVED
                ? 'success'
                : decision === ApprovalDecision.DENIED
                    ? 'skipped'
                    : 'error',
            inputSummary: request.inputSummary,
            error: decision === ApprovalDecision.TIMEOUT
                ? 'Approval request timed out'
                : decision === ApprovalDecision.CANCELLED
                    ? 'Approval request cancelled by turn cancellation'
                    : undefined,
            createdAt: Date.now(),
            metadata: {
                kind: 'approval',
                approvalId: request.id,
                decision,
                timeoutMs: request.timeoutMs,
                expiresAt: request.expiresAt,
                reviewed: reviewReason !== undefined ? 'auto' : undefined,
                reviewReason
            }
        };
        this.auditSink.append(record).catch(() => {});
    }
}

/**
 * A3: category definitions used by `classifyApprovalCategory`. `names` are
 * explicit tool names; `prefixes` are name prefixes (e.g. `mcp.`). The
 * category is resolved in a fixed order so overlapping names (browser tools
 * are network-oriented) classify deterministically.
 */
export const APPROVAL_CATEGORY_DEFINITIONS: Record<ApprovalCategory, { names: string[]; prefixes: string[] }> = {
    network: {
        names: ['web_search', 'web_extract', 'http_fetch', 'http_request', 'browser_open', 'text_browser', 'playwright_browser', 'web_fetch'],
        prefixes: ['web_', 'http_', 'browser_']
    },
    mcp: {
        names: [],
        prefixes: ['mcp.', 'mcp_']
    },
    skill: {
        names: ['skill_list', 'read_skill'],
        prefixes: ['skill.', 'skill_']
    },
    sandbox: {
        names: ['terminal', 'process.start', 'process.poll', 'process.kill', 'execute_code', 'shell.exec', 'sudo.exec', 'git_operations', 'deploy', 'bash', 'sh'],
        prefixes: []
    }
};

const APPROVAL_CATEGORY_ORDER: ApprovalCategory[] = ['network', 'mcp', 'skill', 'sandbox'];

/** Structural tool metadata used to derive the approval category (A3). */
export interface ApprovalCategoryMetadata {
    origin?: 'builtin' | 'skill' | 'mcp';
    sandboxCapability?: string;
}

/**
 * Classify a tool into its granular approval category. When `metadata` is
 * provided it is the primary signal (skill/mcp origins and network/sandbox
 * execution capabilities map directly); otherwise the historical name /
 * prefix table is used. `echo`/`memory.*` and unknown tools stay undefined.
 */
export function classifyApprovalCategory(toolName: string, metadata?: ApprovalCategoryMetadata): ApprovalCategory | undefined {
    if (metadata) {
        if (metadata.origin === 'skill') {
            return 'skill';
        }
        if (metadata.origin === 'mcp') {
            return 'mcp';
        }
        if (metadata.sandboxCapability === 'network_fetch') {
            return 'network';
        }
        if (
            metadata.sandboxCapability === 'process_exec' ||
            metadata.sandboxCapability === 'code_exec' ||
            metadata.sandboxCapability === 'vcs_exec'
        ) {
            return 'sandbox';
        }
    }
    const name = String(toolName ?? '').trim();
    if (!name) {
        return undefined;
    }
    for (const category of APPROVAL_CATEGORY_ORDER) {
        const definition = APPROVAL_CATEGORY_DEFINITIONS[category];
        if (definition.names.includes(name)) {
            return category;
        }
        for (const prefix of definition.prefixes) {
            if (name.startsWith(prefix)) {
                return category;
            }
        }
    }
    return undefined;
}

export class DefaultApprovalStrategy implements ApprovalStrategy {
    private rules: ApprovalRule[];
    readonly autoReview: boolean;

    constructor(blocked?: ApprovalRule[], autoReview = false) {
        this.rules = blocked ?? [
            'shell.exec',
            'fs.write',
            'fs.delete',
            'db.execute',
            'deploy',
            'sudo.exec',
            'playwright_browser',
            'admin.*'
        ];
        this.autoReview = autoReview;
    }

    requires(toolName: string, input: any): boolean {
        for (const rule of this.rules) {
            if (typeof rule === 'string') {
                if (this.matchesPattern(toolName, rule)) return true;
            } else if (this.matchesRule(toolName, input, rule)) {
                return true;
            }
        }
        return false;
    }

    reason(toolName: string, _input: any): string {
        return `Tool "${toolName}" requires approval.`;
    }

    autoDenies(toolName: string, input: any): boolean {
        for (const rule of this.rules) {
            if (typeof rule === 'object' && rule.mode === 'auto-deny' && this.matchesRule(toolName, input, rule)) {
                return true;
            }
        }
        return false;
    }

    private matchesRule(toolName: string, _input: any, rule: ApprovalRuleObject): boolean {
        if (classifyApprovalCategory(toolName) !== rule.category) {
            return false;
        }
        if (rule.names && rule.names.length > 0) {
            return rule.names.some(pattern => this.matchesPattern(toolName, pattern));
        }
        return true;
    }

    private matchesPattern(toolName: string, pattern: string): boolean {
        if (pattern.endsWith('*')) {
            return toolName.startsWith(pattern.slice(0, -1));
        }
        return toolName === pattern;
    }
}
