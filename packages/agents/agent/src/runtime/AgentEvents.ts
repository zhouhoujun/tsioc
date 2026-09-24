import { ApplicationEvent } from '@tsdi/core';
import { ModelResponse } from '../model/ModelResponse';
import { StreamChunkType } from '../model/StreamChunk';
import { PromptCacheRuntimeMetadata } from '../model/ModelProviderOptions';
import { AgentMessage } from './AgentMessage';
import { ScheduledAgentTask } from '../scheduler/ScheduledAgentTask';
import { AgentMemoryRecord } from '../memory/MemoryStore';
import { SandboxPolicy } from '../harness/SandboxExecutor';
import { AgentToolSandboxCapability } from '../tools/AgentTool';
import { ContextPreparationReport } from '../context/AgentContextManager';

const MAX_EVENT_INPUT_SUMMARY_CHARS = 200;

export interface AgentToolLspDiagnostic {
    path?: string;
    message: string;
    severity?: number;
    code?: string | number;
    source?: string;
    startLine?: number;
    endLine?: number;
}

export interface AgentToolExecutionReceipt {
    receiptId: string;
    toolCallId: string;
    toolName: string;
    executionMode: 'sequential' | 'parallel';
    status: 'running' | 'success' | 'error' | 'skipped';
    inputSummary?: string;
    outputSummary?: string;
    durationMs?: number;
    error?: string;
    attemptCount?: number;
    lspDiagnostics?: AgentToolLspDiagnostic[];
    sandboxCapability?: AgentToolSandboxCapability;
    sandboxPolicy?: SandboxPolicy | null;
    sandboxSupported?: boolean;
    sandboxApplied?: boolean;
}

export interface AgentTurnDiagnostics {
    emptyResponseRetryCount: number;
    followUpRecoveryCount: number;
    followUpContextRewritten: boolean;
    finalAssistantWasClarification: boolean;
    repeatedClarificationDetected: boolean;
    /** Number of context compactions performed during this turn. */
    compactionCount: number;
    /** Total tokens saved by compaction across this session. */
    totalTokenSavings: number;
    /** Latest compression ratio (percentage). */
    compressionRatio?: number;
    /** Latest compaction level applied. */
    compactionLevel?: string;
    /** Number of compaction replays applied (G3): last-user-message replay or continue-prompt injection. */
    replayCount?: number;
    /** Latest compaction replay kind applied. */
    replayKind?: 'last-user-message' | 'continue-prompt';
    /** Prompt cache provider support / applied policy observed from the final model response. */
    promptCache?: PromptCacheRuntimeMetadata;
    /** Number of loop-recovery prompts injected for this turn (A4). */
    loopRecoveryCount?: number;
    /** Number of tool rounds falsified by the verification gate (B2). */
    falsificationCount?: number;
    /** Number of distinct falsified rounds accumulated (P53 exploration history). */
    repairRoundsUsed?: number;
    /** Number of falsified entries that repeated an already-rejected attempt (P53). */
    repeatedAttemptCount?: number;
    /** Number of plan-continuation prompts injected because the todo plan still had unfinished items. */
    planContinuationsCount?: number;
}

function summarizeEventInput(input: any): string | undefined {
    if (input === undefined) {
        return undefined;
    }
    const seen = new WeakSet<object>();
    let text: string | undefined;
    try {
        text = typeof input === 'string' ? input : JSON.stringify(input, (_key, current) => {
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
        text = '[unserializable]';
    }
    if (!text) {
        return undefined;
    }
    return text.length > MAX_EVENT_INPUT_SUMMARY_CHARS
        ? `${text.slice(0, MAX_EVENT_INPUT_SUMMARY_CHARS)}...[truncated]`
        : text;
}

export class AgentStartedEvent extends ApplicationEvent {
    constructor(source: Object, readonly name: string) {
        super(source);
    }
}

export class AgentTurnStartedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly input: string) {
        super(source);
    }
}

export class AgentToolInvokedEvent extends ApplicationEvent {
    readonly hasInput: boolean;
    readonly inputSummary?: string;

    constructor(source: Object, readonly sessionId: string, readonly toolName: string, input: any, readonly receipt?: AgentToolExecutionReceipt) {
        super(source);
        this.hasInput = input !== undefined;
        this.inputSummary = summarizeEventInput(input);
    }
}

export class AgentToolCompletedEvent extends ApplicationEvent {
    constructor(
        source: Object,
        readonly sessionId: string,
        readonly toolName: string,
        readonly output: any,
        readonly receipt?: AgentToolExecutionReceipt
    ) {
        super(source);
    }
}

export class AgentToolFailedEvent extends ApplicationEvent {
    constructor(
        source: Object,
        readonly sessionId: string,
        readonly toolName: string,
        readonly error: Error,
        readonly receipt?: AgentToolExecutionReceipt
    ) {
        super(source);
    }
}

export class AgentToolSkippedEvent extends ApplicationEvent {
    constructor(
        source: Object,
        readonly sessionId: string,
        readonly toolName: string,
        readonly reason: string,
        readonly receipt?: AgentToolExecutionReceipt
    ) {
        super(source);
    }
}

export class AgentMemoryRetrievalStartedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly query: string) {
        super(source);
    }
}

export class AgentMemoryRetrievedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly query: string, readonly records: AgentMemoryRecord[]) {
        super(source);
    }
}

export class AgentMemoryRetrievalFailedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly query: string, readonly error: Error) {
        super(source);
    }
}

export class AgentMemoryUpdatedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly record: AgentMemoryRecord) {
        super(source);
    }
}

export class AgentContextPreparedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly report: ContextPreparationReport) {
        super(source);
    }
}

export class AgentTaskScheduledEvent extends ApplicationEvent {
    constructor(source: Object, readonly task: ScheduledAgentTask) {
        super(source);
    }
}

export class AgentModelCompletedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly response: ModelResponse) {
        super(source);
    }
}

export class AgentTurnCompletedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly message: AgentMessage) {
        super(source);
    }
}

export class AgentTurnCancelledEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string) {
        super(source);
    }
}

export class AgentCompensationEvent extends ApplicationEvent {
    constructor(
        source: Object,
        readonly sessionId: string,
        readonly reason: 'cancelled' | 'error',
        readonly compensated: number,
        readonly toolCallIds: string[]
    ) {
        super(source);
    }
}

export class AgentTurnDiagnosticsEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly diagnostics: AgentTurnDiagnostics) {
        super(source);
    }
}

export class AgentStreamChunkEvent extends ApplicationEvent {
    constructor(
        source: Object,
        readonly sessionId: string,
        readonly type: StreamChunkType,
        readonly content?: string,
        readonly toolCalls?: any[],
        readonly usage?: any
    ) {
        super(source);
    }
}

export class AgentErrorEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly error: Error) {
        super(source);
    }
}

export class AgentApprovalRequestedEvent extends ApplicationEvent {
    constructor(source: Object, readonly request: { id: string; toolName: string; sessionId: string; reason: string; summary: string; hasInput: boolean; inputSummary?: string; timeoutMs: number; createdAt?: number; expiresAt?: number }) {
        super(source);
    }
}

export class AgentApprovalCompletedEvent extends ApplicationEvent {
    constructor(source: Object, readonly request: { id: string; toolName: string; sessionId: string }, readonly approved: boolean) {
        super(source);
    }
}

export class AgentApprovalFailedEvent extends ApplicationEvent {
    constructor(source: Object, readonly request: { id: string; toolName: string; sessionId: string }, readonly error: Error) {
        super(source);
    }
}

export class AgentBackgroundTaskStartedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly taskId: string, readonly goal: string) {
        super(source);
    }
}

export class AgentBackgroundTaskCompletedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly taskId: string, readonly summary?: string) {
        super(source);
    }
}

export class AgentBackgroundTaskFailedEvent extends ApplicationEvent {
    constructor(source: Object, readonly sessionId: string, readonly taskId: string, readonly error: Error) {
        super(source);
    }
}

export interface AgentTokenBudgetState {
    scope: 'session' | 'thread';
    scopeId: string;
    budget: number;
    used: number;
    remaining: number;
    exhausted: boolean;
}

export class AgentTokenBudgetReminderEvent extends ApplicationEvent {
    constructor(source: Object, readonly state: AgentTokenBudgetState, readonly fractionRemaining: number) {
        super(source);
    }
}

export class AgentTokenBudgetExceededEvent extends ApplicationEvent {
    constructor(source: Object, readonly state: AgentTokenBudgetState) {
        super(source);
    }
}

export interface AgentPlanStepInfo {
    id: string;
    content: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed' | 'blocked';
    parentId?: string;
    dependsOn?: string[];
    owner?: string;
    estimate?: string;
    kind?: 'task' | 'milestone' | 'bug' | 'feature' | 'chore';
}

export class AgentPlanCreatedEvent extends ApplicationEvent {
    constructor(
        source: Object,
        readonly sessionId: string,
        readonly planId: string,
        readonly steps: AgentPlanStepInfo[],
        readonly sequence: number,
        readonly sourceTool?: string
    ) {
        super(source);
    }
}

export class AgentPlanStepStartedEvent extends ApplicationEvent {
    constructor(
        source: Object,
        readonly sessionId: string,
        readonly planId: string,
        readonly stepId: string,
        readonly sequence: number,
        readonly owner?: string
    ) {
        super(source);
    }
}

export class AgentPlanStepBlockedEvent extends ApplicationEvent {
    constructor(
        source: Object,
        readonly sessionId: string,
        readonly planId: string,
        readonly stepId: string,
        readonly sequence: number,
        readonly reason: string
    ) {
        super(source);
    }
}

export class AgentPlanStepCompletedEvent extends ApplicationEvent {
    constructor(
        source: Object,
        readonly sessionId: string,
        readonly planId: string,
        readonly stepId: string,
        readonly sequence: number,
        readonly status: 'completed' | 'cancelled' | 'failed'
    ) {
        super(source);
    }
}

export class AgentPlanCompletedEvent extends ApplicationEvent {
    constructor(
        source: Object,
        readonly sessionId: string,
        readonly planId: string,
        readonly sequence: number,
        readonly summary: { total: number; completed: number; cancelled: number; failed: number }
    ) {
        super(source);
    }
}
